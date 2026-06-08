import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { ApiResponse } from '@/types';

interface PurchasesStats {
  totalExpenses: number;
  outstandingBills: number;
  totalSuppliers: number;
}

export async function GET(): Promise<NextResponse<ApiResponse<PurchasesStats>>> {
  try {
    const expensesResult = await query(
      `SELECT COALESCE(SUM(total), 0) as total FROM bills WHERE status = 'paid'`
    );
    
    const outstandingResult = await query(
      `SELECT COALESCE(SUM(total), 0) as total FROM bills WHERE status IN ('received', 'overdue')`
    );
    
    const suppliersResult = await query(`SELECT COUNT(*) as count FROM suppliers`);
    
    const stats: PurchasesStats = {
      totalExpenses: parseFloat(expensesResult.rows[0].total),
      outstandingBills: parseFloat(outstandingResult.rows[0].total),
      totalSuppliers: parseInt(suppliersResult.rows[0].count)
    };
    
    return NextResponse.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error fetching purchases stats:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}