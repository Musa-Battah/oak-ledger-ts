import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { ProfitLossReport, ApiResponse, ReportFilter } from '@/types';
import { getCurrentOrganizationId } from '@/lib/auth';

export async function GET(request: NextRequest): Promise<NextResponse<ApiResponse<ProfitLossReport>>> {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'month';
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    
    const orgId = await getCurrentOrganizationId();
    if (!orgId) {
      return NextResponse.json({
        success: false,
        error: 'Organization not found'
      }, { status: 401 });
    }
    
    let dateFilter = '';
    
    if (startDate && endDate) {
      dateFilter = `AND t.date BETWEEN '${startDate}' AND '${endDate}'`;
    } else if (period === 'all') {
      // All Time - no date filter
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
    
    // Get Revenue accounts
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
        AND t.status = 'posted'
        ${dateFilter}
      GROUP BY a.id, a.name, a.code
      ORDER BY a.code
    `, [orgId]);
    
    // Get Expense accounts
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
      AND t.status = 'posted'
      ${dateFilter}
    GROUP BY a.id, a.name, a.code
    ORDER BY a.code
  `, [orgId]);
  
  const revenueItems = revenueResult.rows.map(row => ({
    account_id: row.id,
    account_name: `${row.code} - ${row.name}`,
    amount: parseFloat(row.total),
    transaction_count: parseInt(row.transaction_count)
  }));
  
  const expenseItems = expenseResult.rows.map(row => ({
    account_id: row.id,
    account_name: `${row.code} - ${row.name}`,
    amount: parseFloat(row.total),
    transaction_count: parseInt(row.transaction_count)
  }));
  
  const totalRevenue = revenueItems.reduce((sum, item) => sum + item.amount, 0);
  const totalExpenses = expenseItems.reduce((sum, item) => sum + item.amount, 0);
  const netIncome = totalRevenue - totalExpenses;
  
  const report: ProfitLossReport = {
    revenue: {
      total: totalRevenue,
      items: revenueItems
    },
    cogs: {
      total: 0,
      items: []
    },
    expenses: {
      total: totalExpenses,
      items: expenseItems
    },
    grossProfit: totalRevenue,
    netIncome: netIncome
  };
  
  return NextResponse.json({
    success: true,
    data: report
  });
  } catch (error) {
    console.error('Error generating profit & loss report:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}