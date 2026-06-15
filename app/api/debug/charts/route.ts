import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET() {
  try {
    // Check if there's any revenue data
    const revenueCheck = await query(`
      SELECT COUNT(*) as count, COALESCE(SUM(je.amount), 0) as total
      FROM journal_entries je
      JOIN accounts a ON je.account_id = a.id
      WHERE a.type = 'Revenue' AND je.type = 'credit'
    `);
    
    // Check if there's any expense data
    const expenseCheck = await query(`
      SELECT COUNT(*) as count, COALESCE(SUM(je.amount), 0) as total
      FROM journal_entries je
      JOIN accounts a ON je.account_id = a.id
      WHERE a.type = 'Expense' AND je.type = 'debit'
    `);
    
    // Get sample of recent transactions
    const recentTransactions = await query(`
      SELECT t.date, t.description, t.type, je.amount, a.name as account_name
      FROM transactions t
      JOIN journal_entries je ON t.id = je.transaction_id
      JOIN accounts a ON je.account_id = a.id
      ORDER BY t.date DESC
      LIMIT 5
    `);
    
    return NextResponse.json({
      success: true,
      data: {
        hasRevenue: revenueCheck.rows[0].count > 0,
        revenueTotal: revenueCheck.rows[0].total,
        hasExpenses: expenseCheck.rows[0].count > 0,
        expenseTotal: expenseCheck.rows[0].total,
        recentTransactions: recentTransactions.rows,
        message: revenueCheck.rows[0].count === 0 ? 'No revenue data found. Create some invoices first.' : 'Data exists'
      }
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}