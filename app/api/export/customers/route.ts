import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { query } from '@/lib/db';

export async function GET() {
  try {
    const result = await query(`
      SELECT 
        c.name,
        c.email,
        c.phone,
        c.address,
        COUNT(i.id) as total_invoices,
        COALESCE(SUM(i.total), 0) as total_spent,
        COALESCE(SUM(i.amount_paid), 0) as total_paid,
        COALESCE(SUM(i.balance_due), 0) as outstanding,
        c.created_at
      FROM customers c
      LEFT JOIN invoices i ON c.id = i.customer_id
      GROUP BY c.id, c.name, c.email, c.phone, c.address, c.created_at
      ORDER BY total_spent DESC
    `);

    const worksheetData = result.rows.map(row => ({
      'Customer Name': row.name,
      'Email': row.email || '-',
      'Phone': row.phone || '-',
      'Address': row.address || '-',
      'Total Invoices': parseInt(row.total_invoices),
      'Total Spent (₦)': parseFloat(row.total_spent),
      'Total Paid (₦)': parseFloat(row.total_paid),
      'Outstanding (₦)': parseFloat(row.outstanding),
      'Customer Since': new Date(row.created_at).toLocaleDateString('en-NG')
    }));

    const worksheet = XLSX.utils.json_to_sheet(worksheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Customers');
    
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="customers.xlsx"',
      },
    });
  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json({ error: 'Export failed' }, { status: 500 });
  }
}