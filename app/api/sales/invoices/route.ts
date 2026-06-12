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
      WHERE i.status != 'void'
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
    
    // Find Accounts Receivable
    let arResult = await client.query(`
      SELECT id FROM accounts 
      WHERE code = '1040' AND type = 'Asset' AND is_active = true
      LIMIT 1
    `);
    
    let arAccountId: string;
    if (arResult.rows.length === 0) {
      const newId = uuidv4();
      await client.query(
        `INSERT INTO accounts (id, code, name, type, normal_balance, is_active)
         VALUES ($1, $2, $3, $4, $5, true)`,
        [newId, '1040', 'Accounts Receivable', 'Asset', 'debit']
      );
      arAccountId = newId;
    } else {
      arAccountId = arResult.rows[0].id;
    }
    
    // Find Revenue account
    let revenueResult = await client.query(`
      SELECT id FROM accounts 
      WHERE code IN ('4000', '4010') AND type = 'Revenue' AND is_active = true
      LIMIT 1
    `);
    
    let revenueAccountId: string;
    if (revenueResult.rows.length === 0) {
      const newId = uuidv4();
      await client.query(
        `INSERT INTO accounts (id, code, name, type, normal_balance, is_active)
         VALUES ($1, $2, $3, $4, $5, true)`,
        [newId, '4000', 'Sales Revenue', 'Revenue', 'credit']
      );
      revenueAccountId = newId;
    } else {
      revenueAccountId = revenueResult.rows[0].id;
    }
    
    // Debit: Accounts Receivable
    await client.query(
      `INSERT INTO journal_entries (id, transaction_id, account_id, amount, type)
       VALUES ($1, $2, $3, $4, 'debit')`,
      [uuidv4(), transactionId, arAccountId, total]
    );
    
    // Credit: Revenue
    await client.query(
      `INSERT INTO journal_entries (id, transaction_id, account_id, amount, type)
       VALUES ($1, $2, $3, $4, 'credit')`,
      [uuidv4(), transactionId, revenueAccountId, total]
    );
    
    // Log audit
    await client.query(
      `INSERT INTO audit_logs (id, action, entity_type, entity_id, details, created_at)
       VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)`,
      [uuidv4(), 'CREATE', 'invoice', invoiceId, JSON.stringify({ invoiceNumber, total, customer_id })]
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

export async function PUT(request: NextRequest): Promise<NextResponse<ApiResponse>> {
  const db = await import('@/lib/db');
  const client = await db.getDb().connect();
  
  try {
    await client.query('BEGIN');
    
    const { id, customer_id, date, due_date, notes, items, subtotal, tax, total } = await request.json();
    
    // Check if invoice exists and can be edited
    const existingInvoice = await client.query(
      'SELECT status, total, invoice_number, customer_id FROM invoices WHERE id = $1',
      [id]
    );
    
    if (existingInvoice.rows.length === 0) {
      throw new Error('Invoice not found');
    }
    
    const invoice = existingInvoice.rows[0];
    
    if (invoice.status === 'paid') {
      throw new Error('Cannot edit a paid invoice. Please void it first.');
    }
    
    if (invoice.status === 'void') {
      throw new Error('Cannot edit a voided invoice.');
    }
    
    // Get existing journal entries to reverse
    const existingTransaction = await client.query(
      'SELECT id FROM transactions WHERE reference_number = $1 AND type = $2 AND status = $3',
      [invoice.invoice_number, 'invoice', 'posted']
    );
    
    if (existingTransaction.rows.length > 0) {
      const transactionId = existingTransaction.rows[0].id;
      
      // Reverse existing journal entries
      const entries = await client.query(
        'SELECT * FROM journal_entries WHERE transaction_id = $1',
        [transactionId]
      );
      
      for (const entry of entries.rows) {
        const account = await client.query(
          'SELECT balance, normal_balance FROM accounts WHERE id = $1',
          [entry.account_id]
        );
        
        const currentBalance = parseFloat(account.rows[0].balance);
        const isDebit = entry.type === 'debit';
        const normalBalanceDebit = account.rows[0].normal_balance === 'debit';
        
        let newBalance;
        if (isDebit) {
          newBalance = normalBalanceDebit ? currentBalance - entry.amount : currentBalance + entry.amount;
        } else {
          newBalance = normalBalanceDebit ? currentBalance + entry.amount : currentBalance - entry.amount;
        }
        
        await client.query(
          'UPDATE accounts SET balance = $1 WHERE id = $2',
          [newBalance, entry.account_id]
        );
      }
      
      // Mark old transaction as void
      await client.query(
        'UPDATE transactions SET status = $1, voided_at = CURRENT_TIMESTAMP WHERE id = $2',
        ['void', transactionId]
      );
    }
    
    // Update invoice
    await client.query(
      `UPDATE invoices 
       SET customer_id = $1, date = $2, due_date = $3, notes = $4, 
           subtotal = $5, tax = $6, total = $7, edited_at = CURRENT_TIMESTAMP, 
           edit_count = COALESCE(edit_count, 0) + 1
       WHERE id = $8`,
      [customer_id, date, due_date, notes, subtotal, tax, total, id]
    );
    
    // Delete old items and insert new ones
    await client.query('DELETE FROM invoice_items WHERE invoice_id = $1', [id]);
    
    for (const item of items) {
      const itemId = uuidv4();
      await client.query(
        `INSERT INTO invoice_items (id, invoice_id, description, quantity, unit_price, amount)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [itemId, id, item.description, item.quantity, item.unit_price, item.amount]
      );
    }
    
    // Create new journal entry
    const transactionId = uuidv4();
    await client.query(
      `INSERT INTO transactions (id, date, description, reference_number, type, status)
       VALUES ($1, $2, $3, $4, $5, 'posted')`,
      [transactionId, date, `Invoice ${invoice.invoice_number} (EDITED) - ${items.length} item(s)`, invoice.invoice_number, 'invoice']
    );
    
    // Get account IDs
    const arResult = await client.query(
      'SELECT id FROM accounts WHERE code = $1 AND type = $2',
      ['1040', 'Asset']
    );
    const revenueResult = await client.query(
      'SELECT id FROM accounts WHERE code IN ($1, $2) AND type = $3',
      ['4000', '4010', 'Revenue']
    );
    
    const arAccountId = arResult.rows[0].id;
    const revenueAccountId = revenueResult.rows[0].id;
    
    // Debit: Accounts Receivable
    await client.query(
      `INSERT INTO journal_entries (id, transaction_id, account_id, amount, type)
       VALUES ($1, $2, $3, $4, 'debit')`,
      [uuidv4(), transactionId, arAccountId, total]
    );
    
    // Credit: Revenue
    await client.query(
      `INSERT INTO journal_entries (id, transaction_id, account_id, amount, type)
       VALUES ($1, $2, $3, $4, 'credit')`,
      [uuidv4(), transactionId, revenueAccountId, total]
    );
    
    // Update account balances
    await client.query(
      'UPDATE accounts SET balance = balance + $1 WHERE id = $2',
      [total, arAccountId]
    );
    await client.query(
      'UPDATE accounts SET balance = balance + $1 WHERE id = $2',
      [total, revenueAccountId]
    );
    
    // Log audit
    await client.query(
      `INSERT INTO audit_logs (id, action, entity_type, entity_id, details, created_at)
       VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)`,
      [uuidv4(), 'EDIT', 'invoice', id, JSON.stringify({ old_total: invoice.total, new_total: total, customer_id })]
    );
    
    await client.query('COMMIT');
    
    return NextResponse.json({
      success: true,
      message: 'Invoice updated successfully'
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error updating invoice:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  } finally {
    client.release();
  }
}

export async function DELETE(request: NextRequest): Promise<NextResponse<ApiResponse>> {
  const db = await import('@/lib/db');
  const client = await db.getDb().connect();
  
  try {
    await client.query('BEGIN');
    
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const reason = searchParams.get('reason') || 'No reason provided';
    
    if (!id) {
      return NextResponse.json({ success: false, error: 'Invoice ID required' }, { status: 400 });
    }
    
    // Check if invoice exists
    const invoiceResult = await client.query(
      'SELECT status, total, invoice_number FROM invoices WHERE id = $1',
      [id]
    );
    
    if (invoiceResult.rows.length === 0) {
      throw new Error('Invoice not found');
    }
    
    const invoice = invoiceResult.rows[0];
    
    if (invoice.status === 'paid') {
      throw new Error('Cannot void a paid invoice. Process a refund first.');
    }
    
    if (invoice.status === 'void') {
      throw new Error('Invoice already voided');
    }
    
    // Get existing journal entries to reverse
    const existingTransaction = await client.query(
      'SELECT id FROM transactions WHERE reference_number = $1 AND type = $2 AND status = $3',
      [invoice.invoice_number, 'invoice', 'posted']
    );
    
    if (existingTransaction.rows.length > 0) {
      const transactionId = existingTransaction.rows[0].id;
      
      // Reverse existing journal entries
      const entries = await client.query(
        'SELECT * FROM journal_entries WHERE transaction_id = $1',
        [transactionId]
      );
      
      for (const entry of entries.rows) {
        const account = await client.query(
          'SELECT balance, normal_balance FROM accounts WHERE id = $1',
          [entry.account_id]
        );
        
        const currentBalance = parseFloat(account.rows[0].balance);
        const isDebit = entry.type === 'debit';
        const normalBalanceDebit = account.rows[0].normal_balance === 'debit';
        
        let newBalance;
        if (isDebit) {
          newBalance = normalBalanceDebit ? currentBalance - entry.amount : currentBalance + entry.amount;
        } else {
          newBalance = normalBalanceDebit ? currentBalance + entry.amount : currentBalance - entry.amount;
        }
        
        await client.query(
          'UPDATE accounts SET balance = $1 WHERE id = $2',
          [newBalance, entry.account_id]
        );
      }
      
      // Mark transaction as void
      await client.query(
        'UPDATE transactions SET status = $1, voided_at = CURRENT_TIMESTAMP, void_reason = $2 WHERE id = $3',
        ['void', reason, transactionId]
      );
    }
    
    // Mark invoice as void
    await client.query(
      `UPDATE invoices 
       SET status = $1, voided_at = CURRENT_TIMESTAMP, void_reason = $2
       WHERE id = $3`,
      ['void', reason, id]
    );
    
    // Log audit
    await client.query(
      `INSERT INTO audit_logs (id, action, entity_type, entity_id, reason, details, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)`,
      [uuidv4(), 'VOID', 'invoice', id, reason, JSON.stringify({ invoice_number: invoice.invoice_number })]
    );
    
    await client.query('COMMIT');
    
    return NextResponse.json({
      success: true,
      message: 'Invoice voided successfully'
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error voiding invoice:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  } finally {
    client.release();
  }
}