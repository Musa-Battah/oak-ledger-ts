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
    
    // Find Expense account - use proper expense account
    let expenseResult = await client.query(`
      SELECT id FROM accounts 
      WHERE code = '5000' AND type = 'Expense' AND is_active = true
      LIMIT 1
    `);
    
    if (expenseResult.rows.length === 0) {
      const newId = uuidv4();
      await client.query(
        `INSERT INTO accounts (id, code, name, type, normal_balance, is_active)
         VALUES ($1, $2, $3, $4, $5, true)`,
        [newId, '5000', 'Cost of Goods Sold', 'Expense', 'debit']
      );
      expenseResult = { rows: [{ id: newId }] };
    }
    
    // Find Accounts Payable
    let apResult = await client.query(`
      SELECT id FROM accounts 
      WHERE code = '2000' AND type = 'Liability' AND is_active = true
      LIMIT 1
    `);
    
    if (apResult.rows.length === 0) {
      const newId = uuidv4();
      await client.query(
        `INSERT INTO accounts (id, code, name, type, normal_balance, is_active)
         VALUES ($1, $2, $3, $4, $5, true)`,
        [newId, '2000', 'Accounts Payable', 'Liability', 'credit']
      );
      apResult = { rows: [{ id: newId }] };
    }
    
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