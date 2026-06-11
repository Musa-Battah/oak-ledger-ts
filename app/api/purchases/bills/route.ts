import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { Bill, BillItem, ApiResponse } from '@/types';
import { v4 as uuidv4 } from 'uuid';

export async function GET(request: NextRequest): Promise<NextResponse<ApiResponse<Bill[]>>> {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    
    const result = await query<Bill>(`
      SELECT b.*, s.name as supplier_name
      FROM bills b
      JOIN suppliers s ON b.supplier_id = s.id
      WHERE b.status != 'void'
      ORDER BY b.created_at DESC
      LIMIT $1
    `, [limit]);
    
    for (const bill of result.rows) {
      const items = await query<BillItem>(
        'SELECT * FROM bill_items WHERE bill_id = $1',
        [bill.id]
      );
      bill.items = items.rows;
    }
    
    return NextResponse.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching bills:', error);
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
    
    const { supplier_id, date, due_date, notes, items, subtotal, tax, total } = await request.json();
    
    const billNumber = `BILL-${Date.now()}`;
    const billId = uuidv4();
    
    await client.query(
      `INSERT INTO bills (id, bill_number, supplier_id, date, due_date, subtotal, tax, total, notes, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'received')`,
      [billId, billNumber, supplier_id, date, due_date, subtotal, tax, total, notes]
    );
    
    for (const item of items) {
      const itemId = uuidv4();
      await client.query(
        `INSERT INTO bill_items (id, bill_id, description, quantity, unit_price, amount)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [itemId, billId, item.description, item.quantity, item.unit_price, item.amount]
      );
    }
    
    // Create journal entry
    const transactionId = uuidv4();
    await client.query(
      `INSERT INTO transactions (id, date, description, reference_number, type, status)
       VALUES ($1, $2, $3, $4, $5, 'posted')`,
      [transactionId, date, `Bill ${billNumber} - ${items.length} item(s)`, billNumber, 'bill']
    );
    
    // Find Expense account
    let expenseResult = await client.query(`
      SELECT id FROM accounts 
      WHERE code = '5000' AND type = 'Expense' AND is_active = true
      LIMIT 1
    `);
    
    let expenseAccountId: string;
    if (expenseResult.rows.length === 0) {
      const newId = uuidv4();
      await client.query(
        `INSERT INTO accounts (id, code, name, type, normal_balance, is_active)
         VALUES ($1, $2, $3, $4, $5, true)`,
        [newId, '5000', 'Cost of Goods Sold', 'Expense', 'debit']
      );
      expenseAccountId = newId;
    } else {
      expenseAccountId = expenseResult.rows[0].id;
    }
    
    // Find Accounts Payable
    let apResult = await client.query(`
      SELECT id FROM accounts 
      WHERE code = '2000' AND type = 'Liability' AND is_active = true
      LIMIT 1
    `);
    
    let apAccountId: string;
    if (apResult.rows.length === 0) {
      const newId = uuidv4();
      await client.query(
        `INSERT INTO accounts (id, code, name, type, normal_balance, is_active)
         VALUES ($1, $2, $3, $4, $5, true)`,
        [newId, '2000', 'Accounts Payable', 'Liability', 'credit']
      );
      apAccountId = newId;
    } else {
      apAccountId = apResult.rows[0].id;
    }
    
    // Debit: Expense
    await client.query(
      `INSERT INTO journal_entries (id, transaction_id, account_id, amount, type)
       VALUES ($1, $2, $3, $4, 'debit')`,
      [uuidv4(), transactionId, expenseAccountId, total]
    );
    
    // Credit: Accounts Payable
    await client.query(
      `INSERT INTO journal_entries (id, transaction_id, account_id, amount, type)
       VALUES ($1, $2, $3, $4, 'credit')`,
      [uuidv4(), transactionId, apAccountId, total]
    );
    
    // Log audit
    await client.query(
      `INSERT INTO audit_logs (id, action, entity_type, entity_id, new_data, created_at)
       VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)`,
      [uuidv4(), 'CREATE', 'bill', billId, JSON.stringify({ billNumber, total, supplier_id })]
    );
    
    await client.query('COMMIT');
    
    console.log(`✅ Bill ${billNumber} created successfully`);
    
    return NextResponse.json({
      success: true,
      data: { billId, billNumber },
      message: 'Bill created successfully'
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating bill:', error);
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
    
    const { id, supplier_id, date, due_date, notes, items, subtotal, tax, total } = await request.json();
    
    // Check if bill exists and can be edited
    const existingBill = await client.query(
      'SELECT status, total, bill_number FROM bills WHERE id = $1',
      [id]
    );
    
    if (existingBill.rows.length === 0) {
      throw new Error('Bill not found');
    }
    
    const bill = existingBill.rows[0];
    
    if (bill.status === 'paid') {
      throw new Error('Cannot edit a paid bill. Please void it first.');
    }
    
    if (bill.status === 'void') {
      throw new Error('Cannot edit a voided bill.');
    }
    
    // Get existing journal entries to reverse
    const existingTransaction = await client.query(
      'SELECT id FROM transactions WHERE reference_number = $1 AND type = $2',
      [bill.bill_number, 'bill']
    );
    
    if (existingTransaction.rows.length > 0) {
      const transactionId = existingTransaction.rows[0].id;
      
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
      
      await client.query(
        'UPDATE transactions SET status = $1, voided_at = CURRENT_TIMESTAMP WHERE id = $2',
        ['void', transactionId]
      );
    }
    
    // Update bill
    await client.query(
      `UPDATE bills 
       SET supplier_id = $1, date = $2, due_date = $3, notes = $4, 
           subtotal = $5, tax = $6, total = $7, edited_at = CURRENT_TIMESTAMP, 
           edit_count = COALESCE(edit_count, 0) + 1
       WHERE id = $8`,
      [supplier_id, date, due_date, notes, subtotal, tax, total, id]
    );
    
    // Delete old items and insert new ones
    await client.query('DELETE FROM bill_items WHERE bill_id = $1', [id]);
    
    for (const item of items) {
      const itemId = uuidv4();
      await client.query(
        `INSERT INTO bill_items (id, bill_id, description, quantity, unit_price, amount)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [itemId, id, item.description, item.quantity, item.unit_price, item.amount]
      );
    }
    
    // Create new journal entry
    const transactionId = uuidv4();
    await client.query(
      `INSERT INTO transactions (id, date, description, reference_number, type, status)
       VALUES ($1, $2, $3, $4, $5, 'posted')`,
      [transactionId, date, `Bill ${bill.bill_number} (EDITED) - ${items.length} item(s)`, bill.bill_number, 'bill']
    );
    
    // Get account IDs
    const expenseResult = await client.query(
      'SELECT id FROM accounts WHERE code = $1 AND type = $2',
      ['5000', 'Expense']
    );
    const apResult = await client.query(
      'SELECT id FROM accounts WHERE code = $1 AND type = $2',
      ['2000', 'Liability']
    );
    
    const expenseAccountId = expenseResult.rows[0].id;
    const apAccountId = apResult.rows[0].id;
    
    // Debit: Expense
    await client.query(
      `INSERT INTO journal_entries (id, transaction_id, account_id, amount, type)
       VALUES ($1, $2, $3, $4, 'debit')`,
      [uuidv4(), transactionId, expenseAccountId, total]
    );
    
    // Credit: Accounts Payable
    await client.query(
      `INSERT INTO journal_entries (id, transaction_id, account_id, amount, type)
       VALUES ($1, $2, $3, $4, 'credit')`,
      [uuidv4(), transactionId, apAccountId, total]
    );
    
    // Update account balances
    await client.query(
      'UPDATE accounts SET balance = balance + $1 WHERE id = $2',
      [total, expenseAccountId]
    );
    await client.query(
      'UPDATE accounts SET balance = balance + $1 WHERE id = $2',
      [total, apAccountId]
    );
    
    // Log audit
    await client.query(
      `INSERT INTO audit_logs (id, action, entity_type, entity_id, old_data, new_data, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)`,
      [uuidv4(), 'EDIT', 'bill', id, JSON.stringify(bill), JSON.stringify({ total, supplier_id })]
    );
    
    await client.query('COMMIT');
    
    return NextResponse.json({
      success: true,
      message: 'Bill updated successfully'
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error updating bill:', error);
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
      return NextResponse.json({ success: false, error: 'Bill ID required' }, { status: 400 });
    }
    
    const billResult = await client.query(
      'SELECT status, total, bill_number FROM bills WHERE id = $1',
      [id]
    );
    
    if (billResult.rows.length === 0) {
      throw new Error('Bill not found');
    }
    
    const bill = billResult.rows[0];
    
    if (bill.status === 'paid') {
      throw new Error('Cannot void a paid bill. Process a refund first.');
    }
    
    if (bill.status === 'void') {
      throw new Error('Bill already voided');
    }
    
    const existingTransaction = await client.query(
      'SELECT id FROM transactions WHERE reference_number = $1 AND type = $2 AND status = $3',
      [bill.bill_number, 'bill', 'posted']
    );
    
    if (existingTransaction.rows.length > 0) {
      const transactionId = existingTransaction.rows[0].id;
      
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
      
      await client.query(
        'UPDATE transactions SET status = $1, voided_at = CURRENT_TIMESTAMP, void_reason = $2 WHERE id = $3',
        ['void', reason, transactionId]
      );
    }
    
    await client.query(
      `UPDATE bills 
       SET status = $1, voided_at = CURRENT_TIMESTAMP, void_reason = $2
       WHERE id = $3`,
      ['void', reason, id]
    );
    
    await client.query(
      `INSERT INTO audit_logs (id, action, entity_type, entity_id, reason, created_at)
       VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)`,
      [uuidv4(), 'VOID', 'bill', id, reason]
    );
    
    await client.query('COMMIT');
    
    return NextResponse.json({
      success: true,
      message: 'Bill voided successfully'
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error voiding bill:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  } finally {
    client.release();
  }
}