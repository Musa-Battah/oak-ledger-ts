/**
 * Reports Data Access Layer - Server-Only
 */

import { query } from '@/lib/db';
import { ProfitLossReport, BalanceSheetReport, TrialBalanceReport } from '@/types';

export async function getProfitLossReport(
  period: string = 'month', 
  startDate?: string, 
  endDate?: string
): Promise<ProfitLossReport> {
  let dateFilter = '';
  
  if (startDate && endDate) {
    dateFilter = `AND t.date BETWEEN '${startDate}' AND '${endDate}'`;
  } else {
    const now = new Date();
    switch (period) {
      case 'today':
        dateFilter = `AND t.date = CURRENT_DATE`;
        break;
      case 'week':
        dateFilter = `AND t.date >= CURRENT_DATE - INTERVAL '7 days'`;
        break;
      case 'month':
        dateFilter = `AND t.date >= DATE_TRUNC('month', CURRENT_DATE)`;
        break;
      case 'quarter':
        dateFilter = `AND t.date >= DATE_TRUNC('quarter', CURRENT_DATE)`;
        break;
      case 'year':
        dateFilter = `AND t.date >= DATE_TRUNC('year', CURRENT_DATE)`;
        break;
      default:
        dateFilter = `AND t.date >= DATE_TRUNC('month', CURRENT_DATE)`;
    }
  }
  
  // Get Revenue (Income) - from invoice payments and revenue accounts
  const revenueResult = await query(`
    SELECT 
      a.id, 
      a.name, 
      a.code,
      COALESCE(SUM(je.amount), 0) as total,
      COUNT(DISTINCT t.id) as transaction_count
    FROM accounts a
    LEFT JOIN journal_entries je ON a.id = je.account_id
    LEFT JOIN transactions t ON je.transaction_id = t.id
    WHERE a.type = 'Revenue' 
      AND a.is_active = true
      AND je.type = 'credit'
      AND t.status = 'posted'
      ${dateFilter}
    GROUP BY a.id, a.name, a.code
    ORDER BY a.code
  `);
  
  // Get Cost of Goods Sold (if applicable)
  const cogsResult = await query(`
    SELECT 
      a.id, 
      a.name, 
      a.code,
      COALESCE(SUM(je.amount), 0) as total
    FROM accounts a
    LEFT JOIN journal_entries je ON a.id = je.account_id
    LEFT JOIN transactions t ON je.transaction_id = t.id
    WHERE a.code = '5000' OR a.name ILIKE '%cost of goods%'
      AND a.is_active = true
      AND je.type = 'debit'
      AND t.status = 'posted'
      ${dateFilter}
    GROUP BY a.id, a.name, a.code
  `);
  
  // Get Operating Expenses
  const expenseResult = await query(`
    SELECT 
      a.id, 
      a.name, 
      a.code,
      COALESCE(SUM(je.amount), 0) as total,
      COUNT(DISTINCT t.id) as transaction_count
    FROM accounts a
    LEFT JOIN journal_entries je ON a.id = je.account_id
    LEFT JOIN transactions t ON je.transaction_id = t.id
    WHERE a.type = 'Expense' 
      AND a.is_active = true
      AND a.code NOT LIKE '5000'  -- Exclude COGS if separate
      AND je.type = 'debit'
      AND t.status = 'posted'
      ${dateFilter}
    GROUP BY a.id, a.name, a.code
    ORDER BY a.code
  `);
  
  const revenueItems = revenueResult.rows.map(row => ({
    account_id: row.id,
    account_name: `${row.code} - ${row.name}`,
    amount: parseFloat(row.total),
    transaction_count: parseInt(row.transaction_count)
  }));
  
  const cogsItems = cogsResult.rows.map(row => ({
    account_id: row.id,
    account_name: `${row.code} - ${row.name}`,
    amount: parseFloat(row.total)
  }));
  
  const expenseItems = expenseResult.rows.map(row => ({
    account_id: row.id,
    account_name: `${row.code} - ${row.name}`,
    amount: parseFloat(row.total),
    transaction_count: parseInt(row.transaction_count)
  }));
  
  const totalRevenue = revenueItems.reduce((sum, item) => sum + item.amount, 0);
  const totalCOGS = cogsItems.reduce((sum, item) => sum + item.amount, 0);
  const totalExpenses = expenseItems.reduce((sum, item) => sum + item.amount, 0);
  const grossProfit = totalRevenue - totalCOGS;
  const netIncome = grossProfit - totalExpenses;
  
return {
  revenue: {
    total: totalRevenue,
    items: revenueItems
  },
  cogs: {
    total: totalCOGS,
    items: cogsItems
  },
  expenses: {
    total: totalExpenses,
    items: expenseItems
  },
  grossProfit,
  netIncome
};
  }

export async function getBalanceSheetReport(asAtDate?: string): Promise<BalanceSheetReport> {
  const dateFilter = asAtDate ? `AND created_at <= '${asAtDate}'` : '';
  
  const accountsResult = await query(`
    SELECT id, code, name, type, balance, normal_balance
    FROM accounts
    WHERE is_active = true
    ORDER BY code
  `);
  
  const report: BalanceSheetReport = {
    assets: {
      total: 0,
      current: { total: 0, items: [] },
      fixed: { total: 0, items: [] }
    },
    liabilities: {
      total: 0,
      current: { total: 0, items: [] },
      longTerm: { total: 0, items: [] }
    },
    equity: {
      total: 0,
      items: []
    }
  };
  
  for (const account of accountsResult.rows) {
    const balance = parseFloat(account.balance);
    
    if (account.type === 'Asset') {
      const assetItem = {
        account_id: account.id,
        account_name: `${account.code} - ${account.name}`,
        balance: balance
      };
      
      // Current assets: 1000-1099, Fixed assets: 1100+
      if (account.code.startsWith('1') && parseInt(account.code) < 1100) {
        report.assets.current.items.push(assetItem);
        report.assets.current.total += balance;
      } else if (account.code.startsWith('1')) {
        report.assets.fixed.items.push(assetItem);
        report.assets.fixed.total += balance;
      }
      report.assets.total += balance;
      
    } else if (account.type === 'Liability') {
      const liabilityItem = {
        account_id: account.id,
        account_name: `${account.code} - ${account.name}`,
        balance: balance
      };
      
      // Current liabilities: 2000-2099, Long term: 2100+
      if (account.code.startsWith('2') && parseInt(account.code) < 2100) {
        report.liabilities.current.items.push(liabilityItem);
        report.liabilities.current.total += balance;
      } else if (account.code.startsWith('2')) {
        report.liabilities.longTerm.items.push(liabilityItem);
        report.liabilities.longTerm.total += balance;
      }
      report.liabilities.total += balance;
      
    } else if (account.type === 'Equity') {
      const equityItem = {
        account_id: account.id,
        account_name: `${account.code} - ${account.name}`,
        balance: balance
      };
      report.equity.items.push(equityItem);
      report.equity.total += balance;
    }
  }
  
  return report;
}

export async function getTrialBalanceReport(asAtDate?: string): Promise<TrialBalanceReport> {
  const accountsResult = await query(`
    SELECT id, code, name, type, normal_balance, balance
    FROM accounts
    WHERE is_active = true
    ORDER BY code
  `);
  
  const reportAccounts = [];
  let totalDebits = 0;
  let totalCredits = 0;
  
  for (const account of accountsResult.rows) {
    const balance = parseFloat(account.balance);
    let debit = 0;
    let credit = 0;
    
    // Assets and Expenses normally have debit balances
    // Liabilities, Equity, Revenue normally have credit balances
    if (account.normal_balance === 'debit') {
      debit = Math.abs(balance);
      totalDebits += debit;
    } else {
      credit = Math.abs(balance);
      totalCredits += credit;
    }
    
    reportAccounts.push({
      account_id: account.id,
      account_code: account.code,
      account_name: account.name,
      account_type: account.type,
      debit: debit,
      credit: credit
    });
  }
  
  return {
    accounts: reportAccounts,
    totalDebits: totalDebits,
    totalCredits: totalCredits,
    isBalanced: Math.abs(totalDebits - totalCredits) < 0.01
  };
}

// NEW: Get recent transactions for audit trail
export async function getRecentTransactions(limit: number = 50): Promise<any[]> {
  const result = await query(`
    SELECT 
      t.id,
      t.date,
      t.description,
      t.reference_number,
      t.type,
      t.status,
      json_agg(json_build_object(
        'account_name', a.name,
        'account_code', a.code,
        'amount', je.amount,
        'type', je.type
      )) as entries
    FROM transactions t
    LEFT JOIN journal_entries je ON t.id = je.transaction_id
    LEFT JOIN accounts a ON je.account_id = a.id
    WHERE t.status = 'posted'
    GROUP BY t.id
    ORDER BY t.date DESC
    LIMIT $1
  `, [limit]);
  
  return result.rows;
}

// NEW: Get account activity for a specific period
export async function getAccountActivity(
  accountId: string, 
  startDate: string, 
  endDate: string
): Promise<any[]> {
  const result = await query(`
    SELECT 
      t.date,
      t.description,
      t.reference_number,
      je.amount,
      je.type,
      t.type as transaction_type
    FROM journal_entries je
    JOIN transactions t ON je.transaction_id = t.id
    WHERE je.account_id = $1
      AND t.date BETWEEN $2 AND $3
      AND t.status = 'posted'
    ORDER BY t.date DESC
  `, [accountId, startDate, endDate]);
  
  return result.rows;
}

// NEW: Get summary statistics for dashboard
export async function getDashboardSummary(): Promise<any> {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  
  // Current month revenue
  const revenueResult = await query(`
    SELECT COALESCE(SUM(je.amount), 0) as total
    FROM journal_entries je
    JOIN transactions t ON je.transaction_id = t.id
    JOIN accounts a ON je.account_id = a.id
    WHERE a.type = 'Revenue'
      AND je.type = 'credit'
      AND t.status = 'posted'
      AND t.date >= $1
  `, [startOfMonth.toISOString().split('T')[0]]);
  
  // Current month expenses
  const expenseResult = await query(`
    SELECT COALESCE(SUM(je.amount), 0) as total
    FROM journal_entries je
    JOIN transactions t ON je.transaction_id = t.id
    JOIN accounts a ON je.account_id = a.id
    WHERE a.type = 'Expense'
      AND je.type = 'debit'
      AND t.status = 'posted'
      AND t.date >= $1
  `, [startOfMonth.toISOString().split('T')[0]]);
  
  // Outstanding invoices
  const invoicesResult = await query(`
    SELECT COALESCE(SUM(total), 0) as total
    FROM invoices
    WHERE status IN ('sent', 'overdue')
  `);
  
  // Outstanding bills
  const billsResult = await query(`
    SELECT COALESCE(SUM(total), 0) as total
    FROM bills
    WHERE status IN ('received', 'overdue')
  `);
  
  return {
    monthlyRevenue: parseFloat(revenueResult.rows[0].total),
    monthlyExpenses: parseFloat(expenseResult.rows[0].total),
    monthlyProfit: parseFloat(revenueResult.rows[0].total) - parseFloat(expenseResult.rows[0].total),
    outstandingInvoices: parseFloat(invoicesResult.rows[0].total),
    outstandingBills: parseFloat(billsResult.rows[0].total)
  };
}