import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getCurrentOrganizationId } from '@/lib/auth';

export async function GET() {
  try {
    const orgId = await getCurrentOrganizationId();
    if (!orgId) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 401 });
    }

    // Check all transactions with source types
    const transactions = await query(`
      SELECT id, date, description, type, source_type, status, reference_number 
      FROM transactions 
      WHERE organization_id = $1 
      ORDER BY date DESC 
      LIMIT 20
    `, [orgId]);

    // Check journal entries with account details
    const journalEntries = await query(`
      SELECT je.*, a.code, a.name as account_name, a.type as account_type
      FROM journal_entries je
      JOIN accounts a ON je.account_id = a.id
      WHERE je.organization_id = $1
      ORDER BY je.created_at DESC
      LIMIT 30
    `, [orgId]);

    // Check account balances
    const accountBalances = await query(`
      SELECT code, name, type, balance, normal_balance
      FROM accounts
      WHERE organization_id = $1 AND balance != 0
      ORDER BY code
    `, [orgId]);

    // Check manual journal entries
    const manualEntries = await query(`
      SELECT id, entry_number, date, description, status, created_by
      FROM manual_journal_entries
      WHERE organization_id = $1
      ORDER BY created_at DESC
    `, [orgId]);

    // Check revenue from journal_entries
    const revenueSummary = await query(`
      SELECT 
        a.code, a.name,
        COALESCE(SUM(je.amount), 0) as total,
        COUNT(DISTINCT t.id) as transaction_count
      FROM accounts a
      LEFT JOIN journal_entries je ON a.id = je.account_id
      LEFT JOIN transactions t ON je.transaction_id = t.id
      WHERE a.type = 'Revenue' 
        AND a.organization_id = $1
        AND je.type = 'credit'
      GROUP BY a.id, a.code, a.name
    `, [orgId]);

    // Check expenses from journal_entries
    const expenseSummary = await query(`
      SELECT 
        a.code, a.name,
        COALESCE(SUM(je.amount), 0) as total,
        COUNT(DISTINCT t.id) as transaction_count
      FROM accounts a
      LEFT JOIN journal_entries je ON a.id = je.account_id
      LEFT JOIN transactions t ON je.transaction_id = t.id
      WHERE a.type = 'Expense' 
        AND a.organization_id = $1
        AND je.type = 'debit'
      GROUP BY a.id, a.code, a.name
    `, [orgId]);

    // Check sales from invoices
    const salesSummary = await query(`
      SELECT 
        COUNT(*) as invoice_count,
        COALESCE(SUM(total), 0) as total_revenue,
        COALESCE(SUM(CASE WHEN status = 'paid' THEN total ELSE 0 END), 0) as paid_revenue
      FROM invoices
      WHERE organization_id = $1
    `, [orgId]);

    return NextResponse.json({
      success: true,
      data: {
        totalTransactions: transactions.rows.length,
        transactions: transactions.rows,
        totalJournalEntries: journalEntries.rows.length,
        journalEntries: journalEntries.rows,
        accountBalances: accountBalances.rows,
        manualEntries: manualEntries.rows,
        revenueSummary: revenueSummary.rows,
        expenseSummary: expenseSummary.rows,
        salesSummary: salesSummary.rows
      }
    });
  } catch (error) {
    console.error('Debug error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}