import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import * as XLSX from 'xlsx';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'month';
    const format = searchParams.get('format') || 'json';
    
    let dateFilter = '';
    let periodLabel = '';
    const now = new Date();
    
    switch (period) {
      case 'month':
        dateFilter = `AND t.date >= DATE_TRUNC('month', CURRENT_DATE)`;
        periodLabel = now.toLocaleDateString('en-NG', { month: 'long', year: 'numeric' });
        break;
      case 'quarter':
        dateFilter = `AND t.date >= DATE_TRUNC('quarter', CURRENT_DATE)`;
        periodLabel = `Q${Math.floor(now.getMonth() / 3) + 1} ${now.getFullYear()}`;
        break;
      case 'year':
        dateFilter = `AND t.date >= DATE_TRUNC('year', CURRENT_DATE)`;
        periodLabel = now.getFullYear().toString();
        break;
      default:
        dateFilter = `AND t.date >= DATE_TRUNC('month', CURRENT_DATE)`;
        periodLabel = now.toLocaleDateString('en-NG', { month: 'long', year: 'numeric' });
    }
    
    // Get VAT on sales (output VAT)
    const outputVAT = await query(`
      SELECT 
        COALESCE(SUM(i.tax), 0) as total
      FROM invoices i
      WHERE i.status = 'paid'
        ${dateFilter.replace('t.date', 'i.date')}
    `);
    
    // Get VAT on purchases (input VAT)
    const inputVAT = await query(`
      SELECT 
        COALESCE(SUM(b.tax), 0) as total
      FROM bills b
      WHERE b.status = 'paid'
        ${dateFilter.replace('t.date', 'b.date')}
    `);
    
    // Get detailed sales for VAT report
    const salesDetails = await query(`
      SELECT 
        i.invoice_number,
        c.name as customer_name,
        i.date,
        i.subtotal,
        i.tax as vat_amount,
        i.total
      FROM invoices i
      JOIN customers c ON i.customer_id = c.id
      WHERE i.status = 'paid'
        ${dateFilter.replace('t.date', 'i.date')}
      ORDER BY i.date DESC
    `);
    
    // Get detailed purchases for VAT report
    const purchaseDetails = await query(`
      SELECT 
        b.bill_number,
        s.name as supplier_name,
        b.date,
        b.subtotal,
        b.tax as vat_amount,
        b.total
      FROM bills b
      JOIN suppliers s ON b.supplier_id = s.id
      WHERE b.status = 'paid'
        ${dateFilter.replace('t.date', 'b.date')}
      ORDER BY b.date DESC
    `);
    
    const outputVATTotal = parseFloat(outputVAT.rows[0].total);
    const inputVATTotal = parseFloat(inputVAT.rows[0].total);
    const vatPayable = outputVATTotal - inputVATTotal;
    
    const reportData = {
      period: periodLabel,
      outputVAT: outputVATTotal,
      inputVAT: inputVATTotal,
      vatPayable: vatPayable,
      sales: salesDetails.rows.map(row => ({
        invoice_number: row.invoice_number,
        customer_name: row.customer_name,
        date: row.date,
        subtotal: parseFloat(row.subtotal),
        vat_amount: parseFloat(row.vat_amount),
        total: parseFloat(row.total)
      })),
      purchases: purchaseDetails.rows.map(row => ({
        bill_number: row.bill_number,
        supplier_name: row.supplier_name,
        date: row.date,
        subtotal: parseFloat(row.subtotal),
        vat_amount: parseFloat(row.vat_amount),
        total: parseFloat(row.total)
      }))
    };
    
    if (format === 'excel') {
      // Create Excel workbook
      const workbook = XLSX.utils.book_new();
      
      // Summary sheet
      const summaryData = [{
        'Period': periodLabel,
        'Output VAT (Sales)': outputVATTotal,
        'Input VAT (Purchases)': inputVATTotal,
        'VAT Payable': vatPayable
      }];
      const summarySheet = XLSX.utils.json_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(workbook, summarySheet, 'VAT Summary');
      
      // Sales details sheet
      const salesData = reportData.sales.map(s => ({
        'Invoice #': s.invoice_number,
        'Customer': s.customer_name,
        'Date': new Date(s.date).toLocaleDateString('en-NG'),
        'Subtotal (₦)': s.subtotal,
        'VAT (7.5%)': s.vat_amount,
        'Total (₦)': s.total
      }));
      const salesSheet = XLSX.utils.json_to_sheet(salesData);
      XLSX.utils.book_append_sheet(workbook, salesSheet, 'Sales (Output VAT)');
      
      // Purchase details sheet
      const purchaseData = reportData.purchases.map(p => ({
        'Bill #': p.bill_number,
        'Supplier': p.supplier_name,
        'Date': new Date(p.date).toLocaleDateString('en-NG'),
        'Subtotal (₦)': p.subtotal,
        'VAT (7.5%)': p.vat_amount,
        'Total (₦)': p.total
      }));
      const purchaseSheet = XLSX.utils.json_to_sheet(purchaseData);
      XLSX.utils.book_append_sheet(workbook, purchaseSheet, 'Purchases (Input VAT)');
      
      const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
      
      return new NextResponse(buffer, {
        status: 200,
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="vat-report-${period}.xlsx"`,
        },
      });
    }
    
    return NextResponse.json({
      success: true,
      data: reportData
    });
  } catch (error) {
    console.error('VAT report error:', error);
    return NextResponse.json({ error: 'Failed to generate VAT report' }, { status: 500 });
  }
}