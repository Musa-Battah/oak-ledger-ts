import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET() {
  try {
    // Get last 6 months revenue
    const monthlyRevenue = await query(`
      SELECT 
        TO_CHAR(t.date, 'Mon YYYY') as month,
        COALESCE(SUM(je.amount), 0) as amount
      FROM transactions t
      JOIN journal_entries je ON t.id = je.transaction_id
      JOIN accounts a ON je.account_id = a.id
      WHERE a.type = 'Revenue'
        AND je.type = 'credit'
        AND t.date >= CURRENT_DATE - INTERVAL '6 months'
        AND t.status = 'posted'
      GROUP BY TO_CHAR(t.date, 'Mon YYYY'), DATE_TRUNC('month', t.date)
      ORDER BY DATE_TRUNC('month', t.date)
    `);

    // Get expense breakdown by category
    const expenseBreakdown = await query(`
      SELECT 
        a.name,
        COALESCE(SUM(je.amount), 0) as amount
      FROM accounts a
      LEFT JOIN journal_entries je ON a.id = je.account_id
      LEFT JOIN transactions t ON je.transaction_id = t.id
      WHERE a.type = 'Expense'
        AND je.type = 'debit'
        AND t.date >= CURRENT_DATE - INTERVAL '12 months'
        AND t.status = 'posted'
      GROUP BY a.id, a.name
      HAVING COALESCE(SUM(je.amount), 0) > 0
      ORDER BY amount DESC
      LIMIT 5
    `);

    // Get top 5 customers by revenue
    const topCustomers = await query(`
      SELECT 
        c.name,
        COALESCE(SUM(je.amount), 0) as amount
      FROM customers c
      JOIN invoices i ON c.id = i.customer_id
      JOIN journal_entries je ON i.id = je.transaction_id
      JOIN accounts a ON je.account_id = a.id
      WHERE a.type = 'Revenue'
        AND i.status = 'paid'
        AND je.type = 'credit'
      GROUP BY c.id, c.name
      ORDER BY amount DESC
      LIMIT 5
    `);

    // Get accounts receivable aging
    const agingData = await query(`
      SELECT 
        CASE 
          WHEN due_date >= CURRENT_DATE THEN 'Not Due'
          WHEN due_date >= CURRENT_DATE - INTERVAL '30 days' THEN '1-30 days'
          WHEN due_date >= CURRENT_DATE - INTERVAL '60 days' THEN '31-60 days'
          WHEN due_date >= CURRENT_DATE - INTERVAL '90 days' THEN '61-90 days'
          ELSE '90+ days'
        END as range,
        COALESCE(SUM(balance_due), 0) as amount
      FROM invoices
      WHERE status IN ('sent', 'overdue')
        AND balance_due > 0
      GROUP BY 
        CASE 
          WHEN due_date >= CURRENT_DATE THEN 'Not Due'
          WHEN due_date >= CURRENT_DATE - INTERVAL '30 days' THEN '1-30 days'
          WHEN due_date >= CURRENT_DATE - INTERVAL '60 days' THEN '31-60 days'
          WHEN due_date >= CURRENT_DATE - INTERVAL '90 days' THEN '61-90 days'
          ELSE '90+ days'
        END
      ORDER BY 
        CASE 
          WHEN range = 'Not Due' THEN 1
          WHEN range = '1-30 days' THEN 2
          WHEN range = '31-60 days' THEN 3
          WHEN range = '61-90 days' THEN 4
          ELSE 5
        END
    `);

    return NextResponse.json({
      success: true,
      data: {
        monthlyRevenue: monthlyRevenue.rows.map(row => ({
          month: row.month,
          amount: parseFloat(row.amount)
        })),
        expenseBreakdown: expenseBreakdown.rows.map(row => ({
          name: row.name,
          value: parseFloat(row.amount)
        })),
        topCustomers: topCustomers.rows.map(row => ({
          name: row.name,
          amount: parseFloat(row.amount)
        })),
        agingData: agingData.rows.map(row => ({
          range: row.range,
          amount: parseFloat(row.amount)
        }))
      }
    });
  } catch (error) {
    console.error('Error fetching chart data:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}