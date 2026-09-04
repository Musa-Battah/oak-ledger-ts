import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getCurrentOrganizationId } from '@/lib/auth';

interface TestResult {
  name: string;
  passed: boolean;
  details: string;
  data?: any;
}

export async function GET() {
  try {
    const orgId = await getCurrentOrganizationId();
    if (!orgId) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 401 });
    }

    const results: TestResult[] = [];

    // ============================================
    // TEST 1: Transactions linked to Journal Entries
    // ============================================
    const orphanTransactions = await query(`
      SELECT COUNT(*) as count
      FROM transactions t
      LEFT JOIN journal_entries je ON t.id = je.transaction_id
      WHERE je.id IS NULL AND t.status = 'posted'
      AND t.organization_id = $1
    `, [orgId]);
    
    results.push({
      name: 'Transactions linked to Journal Entries',
      passed: parseInt(orphanTransactions.rows[0].count) === 0,
      details: `${orphanTransactions.rows[0].count} transactions without journal entries`,
      data: orphanTransactions.rows[0]
    });

    // ============================================
    // TEST 2: Journal Entries linked to Transactions
    // ============================================
    const orphanJournalEntries = await query(`
      SELECT COUNT(*) as count
      FROM journal_entries je
      LEFT JOIN transactions t ON je.transaction_id = t.id
      WHERE t.id IS NULL
      AND je.organization_id = $1
    `, [orgId]);
    
    results.push({
      name: 'Journal Entries linked to Transactions',
      passed: parseInt(orphanJournalEntries.rows[0].count) === 0,
      details: `${orphanJournalEntries.rows[0].count} journal entries without transactions`,
      data: orphanJournalEntries.rows[0]
    });

    // ============================================
    // TEST 3: Account Balances vs Journal Entries
    // ============================================
    const balanceDifferences = await query(`
      WITH account_totals AS (
        SELECT 
          account_id,
          SUM(CASE WHEN type = 'debit' THEN amount ELSE 0 END) as total_debits,
          SUM(CASE WHEN type = 'credit' THEN amount ELSE 0 END) as total_credits
        FROM journal_entries
        WHERE organization_id = $1
        GROUP BY account_id
      )
      SELECT 
        COUNT(*) as count,
        SUM(ABS(
          CASE 
            WHEN a.normal_balance = 'debit' THEN a.balance - (at.total_debits - at.total_credits)
            ELSE a.balance - (at.total_credits - at.total_debits)
          END
        )) as total_difference
      FROM accounts a
      JOIN account_totals at ON a.id = at.account_id
      WHERE ABS(
        CASE 
          WHEN a.normal_balance = 'debit' THEN a.balance - (at.total_debits - at.total_credits)
          ELSE a.balance - (at.total_credits - at.total_debits)
        END
      ) > 0.01
      AND a.organization_id = $1
    `, [orgId]);
    
    results.push({
      name: 'Account Balances vs Journal Entries',
      passed: parseInt(balanceDifferences.rows[0].count) === 0,
      details: `${balanceDifferences.rows[0].count} accounts with balance differences (total: ₦${parseFloat(balanceDifferences.rows[0].total_difference).toFixed(2)})`,
      data: balanceDifferences.rows[0]
    });

    // ============================================
    // TEST 4: Accounting Equation (Assets = Liabilities + Equity)
    // ============================================
    const equation = await query(`
      SELECT 
        SUM(CASE WHEN type = 'Asset' THEN balance ELSE 0 END) as total_assets,
        SUM(CASE WHEN type = 'Liability' THEN balance ELSE 0 END) as total_liabilities,
        SUM(CASE WHEN type = 'Equity' THEN balance ELSE 0 END) as total_equity
      FROM accounts
      WHERE is_active = true AND organization_id = $1
    `, [orgId]);
    
    const assets = parseFloat(equation.rows[0].total_assets);
    const liabilities = parseFloat(equation.rows[0].total_liabilities);
    const equity = parseFloat(equation.rows[0].total_equity);
    const difference = assets - (liabilities + equity);
    
    results.push({
      name: 'Accounting Equation (Assets = Liabilities + Equity)',
      passed: Math.abs(difference) < 0.01,
      details: `Assets: ₦${assets.toFixed(2)}, Liabilities: ₦${liabilities.toFixed(2)}, Equity: ₦${equity.toFixed(2)}, Difference: ₦${difference.toFixed(2)}`,
      data: equation.rows[0]
    });

    // ============================================
    // TEST 5: Trial Balance (Debits = Credits)
    // ============================================
    const trialBalance = await query(`
      SELECT 
        SUM(CASE WHEN normal_balance = 'debit' THEN balance ELSE 0 END) as total_debits,
        SUM(CASE WHEN normal_balance = 'credit' THEN balance ELSE 0 END) as total_credits
      FROM accounts
      WHERE is_active = true AND organization_id = $1
    `, [orgId]);
    
    const totalDebits = parseFloat(trialBalance.rows[0].total_debits);
    const totalCredits = parseFloat(trialBalance.rows[0].total_credits);
    
    results.push({
      name: 'Trial Balance (Debits = Credits)',
      passed: Math.abs(totalDebits - totalCredits) < 0.01,
      details: `Debits: ₦${totalDebits.toFixed(2)}, Credits: ₦${totalCredits.toFixed(2)}, Difference: ₦${(totalDebits - totalCredits).toFixed(2)}`,
      data: trialBalance.rows[0]
    });

    // ============================================
    // TEST 6: Revenue Accounts (P&L)
    // ============================================
    const revenueAccounts = await query(`
      SELECT code, name, balance
      FROM accounts
      WHERE type = 'Revenue' AND is_active = true AND organization_id = $1
      ORDER BY code
    `, [orgId]);
    
    const totalRevenue = revenueAccounts.rows.reduce((sum, r) => sum + parseFloat(r.balance), 0);
    
    results.push({
      name: 'Revenue Accounts (P&L)',
      passed: true,
      details: `${revenueAccounts.rows.length} revenue accounts, Total: ₦${totalRevenue.toFixed(2)}`,
      data: revenueAccounts.rows
    });

    // ============================================
    // TEST 7: Expense Accounts (P&L)
    // ============================================
    const expenseAccounts = await query(`
      SELECT code, name, balance
      FROM accounts
      WHERE type = 'Expense' AND is_active = true AND organization_id = $1
      ORDER BY code
    `, [orgId]);
    
    const totalExpenses = expenseAccounts.rows.reduce((sum, r) => sum + parseFloat(r.balance), 0);
    
    results.push({
      name: 'Expense Accounts (P&L)',
      passed: true,
      details: `${expenseAccounts.rows.length} expense accounts, Total: ₦${totalExpenses.toFixed(2)}`,
      data: expenseAccounts.rows
    });

    // ============================================
    // TEST 8: Net Income Calculation
    // ============================================
    results.push({
      name: 'Net Income (Revenue - Expenses)',
      passed: true,
      details: `Revenue: ₦${totalRevenue.toFixed(2)}, Expenses: ₦${totalExpenses.toFixed(2)}, Net Income: ₦${(totalRevenue - totalExpenses).toFixed(2)}`,
      data: { revenue: totalRevenue, expenses: totalExpenses, netIncome: totalRevenue - totalExpenses }
    });

    // ============================================
    // TEST 9: Manual Journal Entries Balance
    // ============================================
    const manualEntries = await query(`
      SELECT 
        COUNT(*) as count,
        SUM(CASE WHEN mje.status = 'posted' THEN 1 ELSE 0 END) as posted_count
      FROM manual_journal_entries mje
      WHERE mje.organization_id = $1
    `, [orgId]);
    
    results.push({
      name: 'Manual Journal Entries',
      passed: true,
      details: `${manualEntries.rows[0].count} total, ${manualEntries.rows[0].posted_count} posted`,
      data: manualEntries.rows[0]
    });

    // ============================================
    // TEST 10: Invoice Status Summary
    // ============================================
    const invoiceSummary = await query(`
      SELECT 
        status,
        COUNT(*) as count,
        COALESCE(SUM(total), 0) as total_amount
      FROM invoices
      WHERE organization_id = $1
      GROUP BY status
      ORDER BY status
    `, [orgId]);
    
    results.push({
      name: 'Invoice Status Summary',
      passed: true,
      details: `${invoiceSummary.rows.length} status types`,
      data: invoiceSummary.rows
    });

    // ============================================
    // TEST 11: Bill Status Summary
    // ============================================
    const billSummary = await query(`
      SELECT 
        status,
        COUNT(*) as count,
        COALESCE(SUM(total), 0) as total_amount
      FROM bills
      WHERE organization_id = $1
      GROUP BY status
      ORDER BY status
    `, [orgId]);
    
    results.push({
      name: 'Bill Status Summary',
      passed: true,
      details: `${billSummary.rows.length} status types`,
      data: billSummary.rows
    });

    // ============================================
    // TEST 12: Report Data Consistency Check
    // ============================================
    // Check if Profit & Loss report data exists
    const hasRevenue = await query(`
      SELECT COUNT(*) as count
      FROM accounts
      WHERE type = 'Revenue' AND is_active = true AND organization_id = $1
    `, [orgId]);
    
    const hasExpenses = await query(`
      SELECT COUNT(*) as count
      FROM accounts
      WHERE type = 'Expense' AND is_active = true AND organization_id = $1
    `, [orgId]);
    
    const hasTransactions = await query(`
      SELECT COUNT(*) as count
      FROM transactions
      WHERE organization_id = $1
    `, [orgId]);
    
    const hasJournalEntries = await query(`
      SELECT COUNT(*) as count
      FROM journal_entries
      WHERE organization_id = $1
    `, [orgId]);
    
    const allPassed = results.every(r => r.passed);
    
    const summary = {
      totalTests: results.length,
      passedTests: results.filter(r => r.passed).length,
      failedTests: results.filter(r => !r.passed).length,
      allPassed: allPassed,
      dataAvailability: {
        hasRevenueAccounts: parseInt(hasRevenue.rows[0].count) > 0,
        hasExpenseAccounts: parseInt(hasExpenses.rows[0].count) > 0,
        hasTransactions: parseInt(hasTransactions.rows[0].count) > 0,
        hasJournalEntries: parseInt(hasJournalEntries.rows[0].count) > 0
      }
    };

    return NextResponse.json({
      success: true,
      summary: summary,
      results: results,
      timestamp: new Date().toISOString(),
      recommendation: allPassed 
        ? 'All tests passed! Your data is consistent and properly linked.'
        : 'Some tests failed. Please review the failing tests above.'
    });
  } catch (error) {
    console.error('Integrity test error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}