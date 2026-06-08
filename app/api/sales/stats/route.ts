import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { ApiResponse, DashboardStats } from '@/types';

export async function GET(): Promise<NextResponse<ApiResponse<DashboardStats>>> {
  try {
    const revenueResult = await query(
      `SELECT COALESCE(SUM(total), 0) as total FROM invoices WHERE status = 'paid'`
    );
    
    const outstandingResult = await query(
      `SELECT COALESCE(SUM(total), 0) as total FROM invoices WHERE status IN ('sent', 'overdue')`
    );
    
    const paidCountResult = await query(
      `SELECT COUNT(*) as count FROM invoices WHERE status = 'paid'`
    );
    
    const customersResult = await query(`SELECT COUNT(*) as count FROM customers`);
    
    const stats: DashboardStats = {
      totalRevenue: parseFloat(revenueResult.rows[0].total),
      outstandingInvoices: parseFloat(outstandingResult.rows[0].total),
      paidInvoices: parseInt(paidCountResult.rows[0].count),
      totalCustomers: parseInt(customersResult.rows[0].count),
      totalExpenses: 0,
      outstandingBills: 0,
      totalSuppliers: 0
    };
    
    return NextResponse.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error fetching sales stats:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}