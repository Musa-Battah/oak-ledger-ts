import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { query } from '@/lib/db';

export async function GET() {
  try {
    const result = await query(`
      SELECT 
        i.invoice_number,
        c.name as customer_name,
        i.date,
        i.due_date,
        i.subtotal,
        i.tax,
        i.total,
        i.amount_paid,
        i.balance_due,
        i.status,
        i.created_at
      FROM invoices i
      JOIN customers c ON i.customer_id = c.id
      WHERE i.status != 'void'
      ORDER BY i.created_at DESC
    `);

    const worksheetData = result.rows.map(row => ({
      'Invoice Number': row.invoice_number,
      'Customer': row.customer_name,
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
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Invoices');
    
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="invoices.xlsx"',
      },
    });
  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json({ error: 'Export failed' }, { status: 500 });
  }
}