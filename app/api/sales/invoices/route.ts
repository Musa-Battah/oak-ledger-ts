import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { Invoice, InvoiceItem, ApiResponse } from '@/types';
import { v4 as uuidv4 } from 'uuid';

export async function GET(request: NextRequest): Promise<NextResponse<ApiResponse<Invoice[]>>> {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const status = searchParams.get('status');
    
    let sql = `
      SELECT i.*, c.name as customer_name
      FROM invoices i
      JOIN customers c ON i.customer_id = c.id
      WHERE 1=1
    `;
    const params: any[] = [];
    
    if (status) {
      sql += ` AND i.status = $${params.length + 1}`;
      params.push(status);
    }
    
    sql += ` ORDER BY i.created_at DESC LIMIT $${params.length + 1}`;
    params.push(limit);
    
    const result = await query<Invoice>(sql, params);
    
    for (const invoice of result.rows) {
      const items = await query<InvoiceItem>(
        'SELECT * FROM invoice_items WHERE invoice_id = $1',
        [invoice.id]
      );
      invoice.items = items.rows;
    }
    
    return NextResponse.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching invoices:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse>> {
  const db = await import('@/lib/db');
  const client = await db.getDb().connect();
  
  try {
    await client.query('BEGIN');
    
    const { customer_id, date, due_date, notes, items, subtotal, tax, total } = await request.json();
    
    const invoiceNumber = `INV-${Date.now()}`;
    const invoiceId = uuidv4();
    
    await client.query(
      `INSERT INTO invoices (id, invoice_number, customer_id, date, due_date, subtotal, tax, total, notes, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'sent')`,
      [invoiceId, invoiceNumber, customer_id, date, due_date, subtotal, tax, total, notes]
    );
    
    for (const item of items) {
      const itemId = uuidv4();
      await client.query(
        `INSERT INTO invoice_items (id, invoice_id, description, quantity, unit_price, amount)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [itemId, invoiceId, item.description, item.quantity, item.unit_price, item.amount]
      );
    }
    
    // Create journal entry
    const transactionId = uuidv4();
    await client.query(
      `INSERT INTO transactions (id, date, description, reference_number, type, status)
       VALUES ($1, $2, $3, $4, $5, 'posted')`,
      [transactionId, date, `Invoice ${invoiceNumber} - ${items.length} item(s)`, invoiceNumber, 'invoice']
    );
    
    // Find Accounts Receivable (Asset)
    let arResult = await client.query(`
      SELECT id FROM accounts 
      WHERE code = '1040' AND type = 'Asset' AND is_active = true
      LIMIT 1
    `);
    
    if (arResult.rows.length === 0) {
      const newId = uuidv4();
      await client.query(
        `INSERT INTO accounts (id, code, name, type, normal_balance, is_active)
         VALUES ($1, $2, $3, $4, $5, true)`,
        [newId, '1040', 'Accounts Receivable', 'Asset', 'debit']
      );
      arResult = { rows: [{ id: newId }] };
    }
    
    // Find Revenue account - USE CORRECT REVENUE ACCOUNT
    let revenueResult = await client.query(`
      SELECT id FROM accounts 
      WHERE code IN ('4000', '4010') AND type = 'Revenue' AND is_active = true
      LIMIT 1
    `);
    
    if (revenueResult.rows.length === 0) {
      const newId = uuidv4();
      await client.query(
        `INSERT INTO accounts (id, code, name, type, normal_balance, is_active)
         VALUES ($1, $2, $3, $4, $5, true)`,
        [newId, '4000', 'Sales Revenue', 'Revenue', 'credit']
      );
      revenueResult = { rows: [{ id: newId }] };
    }
    
    const arAccountId = arResult.rows[0].id;
    const revenueAccountId = revenueResult.rows[0].id;
    
    // Debit: Accounts Receivable
    await client.query(
      `INSERT INTO journal_entries (id, transaction_id, account_id, amount, type)
       VALUES ($1, $2, $3, $4, 'debit')`,
      [uuidv4(), transactionId, arAccountId, total]
    );
    
    // Credit: Revenue (NOT Unearned Revenue!)
    await client.query(
      `INSERT INTO journal_entries (id, transaction_id, account_id, amount, type)
       VALUES ($1, $2, $3, $4, 'credit')`,
      [uuidv4(), transactionId, revenueAccountId, total]
    );
    
    await client.query('COMMIT');
    
    console.log(`✅ Invoice ${invoiceNumber} created successfully`);
    
    return NextResponse.json({
      success: true,
      data: { invoiceId, invoiceNumber },
      message: 'Invoice created successfully'
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating invoice:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  } finally {
    client.release();
  }
}