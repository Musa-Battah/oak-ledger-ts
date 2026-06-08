import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { TrialBalanceReport, ApiResponse } from '@/types';

export async function GET(request: NextRequest): Promise<NextResponse<ApiResponse<TrialBalanceReport>>> {
  try {
    const { searchParams } = new URL(request.url);
    const asAt = searchParams.get('asAt') || new Date().toISOString().split('T')[0];
    
    // Get all accounts with their balances
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
      
      // Determine if balance is debit or credit based on normal balance
      if (account.normal_balance === 'debit') {
        debit = balance;
        totalDebits += balance;
      } else {
        credit = balance;
        totalCredits += balance;
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
    
    const report: TrialBalanceReport = {
      accounts: reportAccounts,
      totalDebits: totalDebits,
      totalCredits: totalCredits,
      isBalanced: Math.abs(totalDebits - totalCredits) < 0.01
    };
    
    return NextResponse.json({
      success: true,
      data: report
    });
  } catch (error) {
    console.error('Error generating trial balance:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}   