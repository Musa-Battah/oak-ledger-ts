import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { query } from '@/lib/db';

export async function GET() {
  try {
    const result = await query(`
      SELECT 
        name,
        sku,
        description,
        unit_price,
        cost,
        unit_price - COALESCE(cost, 0) as margin,
        CASE 
          WHEN cost > 0 THEN ((unit_price - cost) / unit_price * 100)
          ELSE 0
        END as margin_percentage,
        is_active,
        created_at
      FROM products
      ORDER BY name
    `);

    const worksheetData = result.rows.map(row => ({
      'Product Name': row.name,
      'SKU': row.sku || '-',
      'Description': row.description || '-',
      'Selling Price (₦)': parseFloat(row.unit_price),
      'Cost Price (₦)': parseFloat(row.cost || 0),
      'Margin (₦)': parseFloat(row.margin),
      'Margin (%)': parseFloat(row.margin_percentage).toFixed(2),
      'Status': row.is_active ? 'Active' : 'Inactive',
      'Date Added': new Date(row.created_at).toLocaleDateString('en-NG')
    }));

    const worksheet = XLSX.utils.json_to_sheet(worksheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Products');
    
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="products.xlsx"',
      },
    });
  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json({ error: 'Export failed' }, { status: 500 });
  }
}