import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { BalanceSheetReport, ApiResponse } from '@/types';

export async function GET(request: NextRequest): Promise<NextResponse<ApiResponse<BalanceSheetReport>>> {
  try {
    // Get all accounts with their balances
    const accountsResult = await query(`
      SELECT id, code, name, type, balance, normal_balance
      FROM accounts
      WHERE is_active = true
      ORDER BY code
    `);
    
    // Initialize report structure
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
    
    // Categorize accounts
    for (const account of accountsResult.rows) {
      const balance = parseFloat(account.balance);
      
      if (account.type === 'Asset') {
        // For assets, positive balance is normal
        const assetItem = {
          account_id: account.id,
          account_name: `${account.code} - ${account.name}`,
          balance: balance
        };
        
        // Categorize as current or fixed asset based on code
        if (account.code.startsWith('1') || parseInt(account.code) < 1100) {
          report.assets.current.items.push(assetItem);
          report.assets.current.total += balance;
        } else {
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
        
        // Categorize as current or long-term liability
        if (account.code.startsWith('2') || parseInt(account.code) < 2100) {
          report.liabilities.current.items.push(liabilityItem);
          report.liabilities.current.total += balance;
        } else {
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
    
    return NextResponse.json({
      success: true,
      data: report
    });
  } catch (error) {
    console.error('Error generating balance sheet:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}