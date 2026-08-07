import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { ApiResponse, DashboardStats } from '@/types';
import { getCurrentOrganizationId } from '@/lib/auth';

export async function GET(): Promise<NextResponse<ApiResponse<DashboardStats>>> {
  try {
    const orgId = await getCurrentOrganizationId();
    if (!orgId) {
      return NextResponse.json({
        success: false,
        error: 'Organization not found'
      }, { status: 401 });
    }

    // Get total revenue from ALL sources (invoices + manual journal entries)
    const revenueResult = await query(`
      SELECT COALESCE(SUM(je.amount), 0) as total
      FROM journal_entries je
      JOIN accounts a ON je.account_id = a.id
      WHERE a.type = 'Revenue'
        AND je.type = 'credit'
        AND je.organization_id = $1
    `, [orgId]);

    // Get outstanding invoices (sent + overdue) - still from invoices table
    const outstandingResult = await query(`
      SELECT COALESCE(SUM(total), 0) as total 
      FROM invoices 
      WHERE status IN ('sent', 'overdue')
        AND organization_id = $1
    `, [orgId]);

    // Count paid invoices
    const paidCountResult = await query(`
      SELECT COUNT(*) as count 
      FROM invoices 
      WHERE status = 'paid'
        AND organization_id = $1
    `, [orgId]);

    // Get total customers
    const customersResult = await query(`
      SELECT COUNT(*) as count 
      FROM customers
      WHERE organization_id = $1
    `, [orgId]);

    // Get total expenses from ALL sources (bills + manual journal entries)
    const expensesResult = await query(`
      SELECT COALESCE(SUM(je.amount), 0) as total
      FROM journal_entries je
      JOIN accounts a ON je.account_id = a.id
      WHERE a.type = 'Expense'
        AND je.type = 'debit'
        AND je.organization_id = $1
    `, [orgId]);

    // Get outstanding bills
    const outstandingBillsResult = await query(`
      SELECT COALESCE(SUM(total), 0) as total 
      FROM bills 
      WHERE status IN ('received', 'overdue')
        AND organization_id = $1
    `, [orgId]);

    // Get total suppliers
    const suppliersResult = await query(`
      SELECT COUNT(*) as count 
      FROM suppliers
      WHERE organization_id = $1
    `, [orgId]);

    // Get total employees (if payroll exists)
    let totalEmployees = 0;
    try {
      const employeesResult = await query(`
        SELECT COUNT(*) as count 
        FROM employees
        WHERE organization_id = $1
      `, [orgId]);
      totalEmployees = parseInt(employeesResult.rows[0].count);
    } catch {
      // Payroll table may not exist yet
    }

    // Get latest payroll amount
    let recentPayrollAmount = 0;
    try {
      const payrollResult = await query(`
        SELECT total_net_pay 
        FROM payroll_runs 
        WHERE organization_id = $1 
        ORDER BY created_at DESC 
        LIMIT 1
      `, [orgId]);
      if (payrollResult.rows.length > 0) {
        recentPayrollAmount = parseFloat(payrollResult.rows[0].total_net_pay);
      }
    } catch {
      // Payroll table may not exist yet
    }

    const stats: DashboardStats = {
      totalRevenue: parseFloat(revenueResult.rows[0].total),
      outstandingInvoices: parseFloat(outstandingResult.rows[0].total),
      paidInvoices: parseInt(paidCountResult.rows[0].count),
      totalCustomers: parseInt(customersResult.rows[0].count),
      totalExpenses: parseFloat(expensesResult.rows[0].total),
      outstandingBills: parseFloat(outstandingBillsResult.rows[0].total),
      totalSuppliers: parseInt(suppliersResult.rows[0].count),
      totalEmployees: totalEmployees,
      recentPayrollAmount: recentPayrollAmount
    };

    return NextResponse.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}