import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getCurrentOrganizationId } from '@/lib/auth';

export async function GET() {
  try {
    const orgId = await getCurrentOrganizationId();
    if (!orgId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Get last 6 months revenue - from journal_entries (UNIFIED)
    const monthlyRevenue = await query(`
      SELECT 
        TO_CHAR(DATE_TRUNC('month', t.date), 'Mon YYYY') as month,
        COALESCE(SUM(je.amount), 0) as amount
      FROM transactions t
      JOIN journal_entries je ON t.id = je.transaction_id
      JOIN accounts a ON je.account_id = a.id
      WHERE a.type = 'Revenue'
        AND je.type = 'credit'
        AND t.date >= CURRENT_DATE - INTERVAL '6 months'
        AND t.status = 'posted'
        AND je.organization_id = $1
      GROUP BY DATE_TRUNC('month', t.date)
      ORDER BY DATE_TRUNC('month', t.date)
    `, [orgId]);

    // Get expense breakdown - from journal_entries (UNIFIED)
    const expenseBreakdown = await query(`
      SELECT 
        a.name,
        COALESCE(SUM(je.amount), 0) as value
      FROM accounts a
      JOIN journal_entries je ON a.id = je.account_id
      JOIN transactions t ON je.transaction_id = t.id
      WHERE a.type = 'Expense'
        AND je.type = 'debit'
        AND t.status = 'posted'
        AND je.organization_id = $1
      GROUP BY a.id, a.name
      HAVING COALESCE(SUM(je.amount), 0) > 0
      ORDER BY value DESC
      LIMIT 5
    `, [orgId]);

    // Get top 5 customers by revenue - from invoices and journal_entries
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
        AND je.organization_id = $1
      GROUP BY c.id, c.name
      ORDER BY amount DESC
      LIMIT 5
    `, [orgId]);

    // Get accounts receivable aging - from invoices
    const agingData = await query(`
      SELECT 
        CASE 
          WHEN due_date >= CURRENT_DATE THEN 'Not Due'
          WHEN due_date >= CURRENT_DATE - INTERVAL '30 days' THEN '1-30 days'
          WHEN due_date >= CURRENT_DATE - INTERVAL '60 days' THEN '31-60 days'
          WHEN due_date >= CURRENT_DATE - INTERVAL '90 days' THEN '61-90 days'
          ELSE '90+ days'
        END as aging_range,
        COALESCE(SUM(balance_due), 0) as amount
      FROM invoices
      WHERE status IN ('sent', 'overdue')
        AND balance_due > 0
        AND organization_id = $1
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
          WHEN due_date >= CURRENT_DATE THEN 1
          WHEN due_date >= CURRENT_DATE - INTERVAL '30 days' THEN 2
          WHEN due_date >= CURRENT_DATE - INTERVAL '60 days' THEN 3
          WHEN due_date >= CURRENT_DATE - INTERVAL '90 days' THEN 4
          ELSE 5
        END
    `, [orgId]);

    // Format the data properly
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
      agingData: agingData.rows.map(row => ({
        range: row.aging_range,
        amount: parseFloat(row.amount)
      }))
    };

    return NextResponse.json({
      success: true,
      data: formattedData
    });
  } catch (error) {
    console.error('Error fetching chart data:', error);
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