import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { query } from '@/lib/db';

export async function GET() {
  try {
    const result = await query(`
      SELECT 
        s.name,
        s.email,
        s.phone,
        s.address,
        COUNT(b.id) as total_bills,
        COALESCE(SUM(b.total), 0) as total_amount,
        COALESCE(SUM(b.amount_paid), 0) as total_paid,
        COALESCE(SUM(b.balance_due), 0) as outstanding,
        s.created_at
      FROM suppliers s
      LEFT JOIN bills b ON s.id = b.supplier_id
      GROUP BY s.id, s.name, s.email, s.phone, s.address, s.created_at
      ORDER BY s.name
    `);

    const worksheetData = result.rows.map(row => ({
      'Supplier Name': row.name,
      'Email': row.email || '-',
      'Phone': row.phone || '-',
      'Address': row.address || '-',
      'Total Bills': parseInt(row.total_bills),
      'Total Amount (₦)': parseFloat(row.total_amount),
      'Total Paid (₦)': parseFloat(row.total_paid),
      'Outstanding (₦)': parseFloat(row.outstanding),
      'Added Date': new Date(row.created_at).toLocaleDateString('en-NG')
    }));

    const worksheet = XLSX.utils.json_to_sheet(worksheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Suppliers');
    
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="suppliers.xlsx"',
      },
    });
  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json({ error: 'Export failed' }, { status: 500 });
  }
}