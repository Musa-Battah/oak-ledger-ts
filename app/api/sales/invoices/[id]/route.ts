import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { Invoice, ApiResponse } from '@/types';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse<Invoice>>> {
  try {
    const { id } = await params;
    
    const result = await query(`
      SELECT i.*, c.name as customer_name
      FROM invoices i
      JOIN customers c ON i.customer_id = c.id
      WHERE i.id = $1
    `, [id]);
    
    if (result.rows.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Invoice not found'
      }, { status: 404 });
    }
    
    const items = await query(`
      SELECT * FROM invoice_items WHERE invoice_id = $1
    `, [id]);
    
    const invoice = result.rows[0];
    invoice.items = items.rows;
    
    return NextResponse.json({
      success: true,
      data: invoice
    });
  } catch (error) {
    console.error('Error fetching invoice:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}