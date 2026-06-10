import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { Bill, ApiResponse } from '@/types';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse<Bill>>> {
  try {
    const { id } = await params;
    
    const result = await query(`
      SELECT b.*, s.name as supplier_name
      FROM bills b
      JOIN suppliers s ON b.supplier_id = s.id
      WHERE b.id = $1
    `, [id]);
    
    if (result.rows.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Bill not found'
      }, { status: 404 });
    }
    
    const items = await query(`
      SELECT * FROM bill_items WHERE bill_id = $1
    `, [id]);
    
    const bill = result.rows[0];
    bill.items = items.rows;
    
    return NextResponse.json({
      success: true,
      data: bill
    });
  } catch (error) {
    console.error('Error fetching bill:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}