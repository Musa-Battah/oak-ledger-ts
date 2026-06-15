import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { query } from '@/lib/db';

export async function GET() {
  try {
    const result = await query(`
      SELECT 
        b.bill_number,
        s.name as supplier_name,
        b.date,
        b.due_date,
        b.subtotal,
        b.tax,
        b.total,
        b.amount_paid,
        b.balance_due,
        b.status,
        b.created_at
      FROM bills b
      JOIN suppliers s ON b.supplier_id = s.id
      WHERE b.status != 'void'
      ORDER BY b.created_at DESC
    `);

    const worksheetData = result.rows.map(row => ({
      'Bill Number': row.bill_number,
      'Supplier': row.supplier_name,
      'Date': new Date(row.date).toLocaleDateString('en-NG'),
      'Due Date': new Date(row.due_date).toLocaleDateString('en-NG'),
      'Subtotal (₦)': parseFloat(row.subtotal),
      'VAT (7.5%)': parseFloat(row.tax),
      'Total (₦)': parseFloat(row.total),
      'Amount Paid (₦)': parseFloat(row.amount_paid || 0),
      'Balance Due (₦)': parseFloat(row.balance_due || 0),
      'Status': row.status.toUpperCase(),
      'Created': new Date(row.created_at).toLocaleDateString('en-NG')
    }));

    const worksheet = XLSX.utils.json_to_sheet(worksheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Bills');
    
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="bills.xlsx"',
      },
    });
  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json({ error: 'Export failed' }, { status: 500 });
  }
}