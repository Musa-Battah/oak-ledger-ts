import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET() {
  try {
    // Get all accounts with balances
    const accounts = await query(`
      SELECT code, name, type, normal_balance, balance 
      FROM accounts 
      WHERE is_active = true 
      ORDER BY code
    `);
    
    // Get summary by account type
    const summary = await query(`
      SELECT 
        type,
        COUNT(*) as count,
        SUM(CASE WHEN normal_balance = 'debit' THEN balance ELSE 0 END) as total_debits,
        SUM(CASE WHEN normal_balance = 'credit' THEN balance ELSE 0 END) as total_credits
      FROM accounts
      WHERE is_active = true
      GROUP BY type
    `);
    
    // Get recent journal entries
    const journalEntries = await query(`
      SELECT 
        t.date,
        t.description,
        t.type as transaction_type,
        a.code,
        a.name as account_name,
        a.type as account_type,
        je.amount,
        je.type as debit_credit
      FROM journal_entries je
      JOIN transactions t ON je.transaction_id = t.id
      JOIN accounts a ON je.account_id = a.id
      ORDER BY t.date DESC
      LIMIT 20
    `);
    
    // Check if accounting equation balances
    const equation = await query(`
      SELECT 
        SUM(CASE WHEN type = 'Asset' THEN balance ELSE 0 END) as total_assets,
        SUM(CASE WHEN type = 'Liability' THEN balance ELSE 0 END) as total_liabilities,
        SUM(CASE WHEN type = 'Equity' THEN balance ELSE 0 END) as total_equity
      FROM accounts
      WHERE is_active = true
    `);
    
    const totalAssets = parseFloat(equation.rows[0].total_assets || 0);
    const totalLiabilities = parseFloat(equation.rows[0].total_liabilities || 0);
    const totalEquity = parseFloat(equation.rows[0].total_equity || 0);
    const isBalanced = Math.abs(totalAssets - (totalLiabilities + totalEquity)) < 0.01;
    
    return NextResponse.json({
      success: true,
      data: {
        accounts: accounts.rows,
        summary: summary.rows,
        recentJournalEntries: journalEntries.rows,
        accountingEquation: {
          totalAssets,
          totalLiabilities,
          totalEquity,
          totalLiabilitiesAndEquity: totalLiabilities + totalEquity,
          isBalanced
        }
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