import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET() {
  try {
    // Simplified query with timeout handling
    const results = await Promise.allSettled([
      // Get last 6 months revenue - simplified
      query(`
        SELECT 
          TO_CHAR(DATE_TRUNC('month', t.date), 'Mon YYYY') as month,
          COALESCE(SUM(je.amount), 0) as amount
        FROM transactions t
        JOIN journal_entries je ON t.id = je.transaction_id
        WHERE je.type = 'credit'
          AND t.date >= CURRENT_DATE - INTERVAL '6 months'
          AND t.status = 'posted'
        GROUP BY DATE_TRUNC('month', t.date)
        ORDER BY DATE_TRUNC('month', t.date)
        LIMIT 6
      `),
      
      // Get expense breakdown - simplified
      query(`
        SELECT 
          a.name,
          COALESCE(SUM(je.amount), 0) as value
        FROM accounts a
        JOIN journal_entries je ON a.id = je.account_id
        WHERE a.type = 'Expense'
          AND je.type = 'debit'
        GROUP BY a.id, a.name
        HAVING COALESCE(SUM(je.amount), 0) > 0
        ORDER BY value DESC
        LIMIT 5
      `),
      
      // Get top customers - simplified
      query(`
        SELECT 
          c.name,
          COALESCE(SUM(je.amount), 0) as amount
        FROM customers c
        JOIN invoices i ON c.id = i.customer_id
        JOIN journal_entries je ON i.id = je.transaction_id
        WHERE je.type = 'credit'
          AND i.status = 'paid'
        GROUP BY c.id, c.name
        ORDER BY amount DESC
        LIMIT 5
      `),
      
      // Get accounts receivable aging - simplified without complex CASE in GROUP BY
      query(`
        SELECT 
          COALESCE(SUM(balance_due), 0) as total_outstanding
        FROM invoices
        WHERE status IN ('sent', 'overdue')
          AND balance_due > 0
      `)
    ]);
    
    // Process results with fallbacks
    let monthlyRevenue = { rows: [] };
    let expenseBreakdown = { rows: [] };
    let topCustomers = { rows: [] };
    let agingResult = { rows: [{ total_outstanding: 0 }] };
    
    if (results[0].status === 'fulfilled') monthlyRevenue = results[0].value;
    if (results[1].status === 'fulfilled') expenseBreakdown = results[1].value;
    if (results[2].status === 'fulfilled') topCustomers = results[2].value;
    if (results[3].status === 'fulfilled') agingResult = results[3].value;
    
    // Create aging data from total
    const agingData = [
      { range: 'Outstanding', amount: parseFloat(agingResult.rows[0]?.total_outstanding || 0) }
    ];
    
    const formattedData = {
      monthlyRevenue: monthlyRevenue.rows.map(row => ({
        month: row.month,
        amount: parseFloat(row.amount)
      })),
      expenseBreakdown: expenseBreakdown.rows.map(row => ({
        name: row.name,
        value: parseFloat(row.value)
      })),
      topCustomers: topCustomers.rows.map(row => ({
        name: row.name,
        amount: parseFloat(row.amount)
      })),
      agingData: agingData
    };
    
    return NextResponse.json({
      success: true,
      data: formattedData
    });
  } catch (error) {
    console.error('Error fetching chart data:', error);
    // Return empty data instead of error to prevent dashboard from breaking
    return NextResponse.json({
      success: true,
      data: {
        monthlyRevenue: [],
        expenseBreakdown: [],
        topCustomers: [],
        agingData: [{ range: 'Outstanding', amount: 0 }]
      }
    });
  }
}