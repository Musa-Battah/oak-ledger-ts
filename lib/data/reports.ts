/**
 * Reports Data Access Layer - Server-Only
 */

import { query } from '@/lib/db';
import { ProfitLossReport, BalanceSheetReport, TrialBalanceReport } from '@/types';
import { getCurrentOrganizationId } from '@/lib/auth';

async function getOrgFilter(): Promise<string> {
  const orgId = await getCurrentOrganizationId();
  if (!orgId) {
    throw new Error('Organization not found');
  }
  return orgId;
}

export async function getProfitLossReport(period: string = 'month', startDate?: string, endDate?: string): Promise<ProfitLossReport> {
  const orgId = await getOrgFilter();
  
  let dateFilter = '';
  
  if (startDate && endDate) {
    dateFilter = `AND t.date BETWEEN '${startDate}' AND '${endDate}'`;
  } else if (period === 'all') {
    dateFilter = '';
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
  
  // Get Revenue accounts - includes ALL sources
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
      AND a.organization_id = $1
      AND je.type = 'credit'
      ${dateFilter}
    GROUP BY a.id, a.name, a.code
    ORDER BY a.code
  `, [orgId]);
  
  // Get COGS accounts
  const cogsResult = await query(`
    SELECT 
      a.id, 
      a.name, 
      a.code,
      COALESCE(SUM(je.amount), 0) as total
    FROM accounts a
    LEFT JOIN journal_entries je ON a.id = je.account_id
    LEFT JOIN transactions t ON je.transaction_id = t.id
    WHERE (a.code = '5000' OR a.name ILIKE '%cost of goods%' OR a.name ILIKE '%cogs%')
      AND a.is_active = true
      AND a.organization_id = $1
      AND je.type = 'debit'
      ${dateFilter}
    GROUP BY a.id, a.name, a.code
  `, [orgId]);
  
  // Get Expense accounts - includes ALL expense sources
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
      AND a.organization_id = $1
      AND je.type = 'debit'
      ${dateFilter}
    GROUP BY a.id, a.name, a.code
    ORDER BY a.code
  `, [orgId]);
  
  const revenueItems = revenueResult.rows.map(row => ({
    account_id: row.id,
    account_name: `${row.code} - ${row.name}`,
    amount: parseFloat(row.total),
    transaction_count: parseInt(row.transaction_count) || 0
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
    transaction_count: parseInt(row.transaction_count) || 0
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
    grossProfit: grossProfit,
    netIncome: netIncome
  };
}

export async function getBalanceSheetReport(asAtDate?: string): Promise<BalanceSheetReport> {
  const orgId = await getOrgFilter();
  
  const accountsResult = await query(`
    SELECT id, code, name, type, balance, normal_balance
    FROM accounts
    WHERE is_active = true
      AND organization_id = $1
    ORDER BY code
  `, [orgId]);
  
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
      
      const codeNum = parseInt(account.code);
      if (codeNum >= 1000 && codeNum < 1100) {
        report.assets.current.items.push(assetItem);
        report.assets.current.total += balance;
      } else if (codeNum >= 1100) {
        report.assets.fixed.items.push(assetItem);
        report.assets.fixed.total += balance;
      } else {
        report.assets.current.items.push(assetItem);
        report.assets.current.total += balance;
      }
      report.assets.total += balance;
      
    } else if (account.type === 'Liability') {
      const liabilityItem = {
        account_id: account.id,
        account_name: `${account.code} - ${account.name}`,
        balance: balance
      };
      
      const codeNum = parseInt(account.code);
      if (codeNum >= 2000 && codeNum < 2100) {
        report.liabilities.current.items.push(liabilityItem);
        report.liabilities.current.total += balance;
      } else if (codeNum >= 2100) {
        report.liabilities.longTerm.items.push(liabilityItem);
        report.liabilities.longTerm.total += balance;
      } else {
        report.liabilities.current.items.push(liabilityItem);
        report.liabilities.current.total += balance;
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
  const orgId = await getOrgFilter();
  
  const accountsResult = await query(`
    SELECT id, code, name, type, normal_balance, balance
    FROM accounts
    WHERE is_active = true
      AND organization_id = $1
    ORDER BY code
  `, [orgId]);
  
  const reportAccounts = [];
  let totalDebits = 0;
  let totalCredits = 0;
  
  for (const account of accountsResult.rows) {
    const balance = parseFloat(account.balance);
    let debit = 0;
    let credit = 0;
    
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