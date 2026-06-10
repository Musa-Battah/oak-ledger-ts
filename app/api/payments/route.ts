import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { ApiResponse } from '@/types';
import { v4 as uuidv4 } from 'uuid';

export async function GET(request: NextRequest): Promise<NextResponse<ApiResponse<any[]>>> {
  try {
    const { searchParams } = new URL(request.url);
    const invoiceId = searchParams.get('invoiceId');
    const billId = searchParams.get('billId');
    
    let sql = `
      SELECT p.*, 
        CASE 
          WHEN p.invoice_id IS NOT NULL THEN i.invoice_number
          WHEN p.bill_id IS NOT NULL THEN b.bill_number
        END as document_number,
        CASE 
          WHEN p.invoice_id IS NOT NULL THEN c.name
          WHEN p.bill_id IS NOT NULL THEN s.name
        END as party_name
      FROM payments p
      LEFT JOIN invoices i ON p.invoice_id = i.id
      LEFT JOIN bills b ON p.bill_id = b.id
      LEFT JOIN customers c ON i.customer_id = c.id
      LEFT JOIN suppliers s ON b.supplier_id = s.id
      WHERE 1=1
    `;
    
    const params: any[] = [];
    
    if (invoiceId) {
      sql += ` AND p.invoice_id = $${params.length + 1}`;
      params.push(invoiceId);
    }
    
    if (billId) {
      sql += ` AND p.bill_id = $${params.length + 1}`;
      params.push(billId);
    }
    
    sql += ` ORDER BY p.payment_date DESC`;
    
    const result = await query(sql, params);
    
    return NextResponse.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching payments:', error);
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
    
    const body = await request.json();
    const { invoice_id, bill_id, payment_date, amount, payment_method, reference_number, notes } = body;
    
    if (!invoice_id && !bill_id) {
      return NextResponse.json({
        success: false,
        error: 'Either invoice_id or bill_id is required'
      }, { status: 400 });
    }
    
    if (!amount || amount <= 0) {
      return NextResponse.json({
        success: false,
        error: 'Valid amount is required'
      }, { status: 400 });
    }
    
    // Generate payment number
    const paymentNumber = `PAY-${Date.now()}`;
    const paymentId = uuidv4();
    
    // Get the document details
    let documentTotal = 0;
    let documentPaid = 0;
    let customerId = null;
    let supplierId = null;
    
    if (invoice_id) {
      const invoice = await client.query(
        'SELECT total, COALESCE(amount_paid, 0) as paid, customer_id FROM invoices WHERE id = $1',
        [invoice_id]
      );
      if (invoice.rows.length === 0) {
        throw new Error('Invoice not found');
      }
      documentTotal = parseFloat(invoice.rows[0].total);
      documentPaid = parseFloat(invoice.rows[0].paid);
      customerId = invoice.rows[0].customer_id;
      
      if (documentPaid + amount > documentTotal) {
        throw new Error(`Payment amount exceeds invoice balance. Balance due: ${documentTotal - documentPaid}`);
      }
    } else if (bill_id) {
      const bill = await client.query(
        'SELECT total, COALESCE(amount_paid, 0) as paid, supplier_id FROM bills WHERE id = $1',
        [bill_id]
      );
      if (bill.rows.length === 0) {
        throw new Error('Bill not found');
      }
      documentTotal = parseFloat(bill.rows[0].total);
      documentPaid = parseFloat(bill.rows[0].paid);
      supplierId = bill.rows[0].supplier_id;
      
      if (documentPaid + amount > documentTotal) {
        throw new Error(`Payment amount exceeds bill balance. Balance due: ${documentTotal - documentPaid}`);
      }
    }
    
    // Create payment record
    await client.query(
      `INSERT INTO payments (id, payment_number, invoice_id, bill_id, customer_id, supplier_id, 
        payment_date, amount, payment_method, reference_number, notes, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'completed')`,
      [paymentId, paymentNumber, invoice_id || null, bill_id || null, customerId, supplierId, 
       payment_date, amount, payment_method, reference_number || null, notes || null]
    );
    
    // Create journal entry for payment
    const transactionId = uuidv4();
    await client.query(
      `INSERT INTO transactions (id, date, description, reference_number, type, status)
       VALUES ($1, $2, $3, $4, $5, 'posted')`,
      [transactionId, payment_date, `Payment ${paymentNumber}`, paymentNumber, 'payment']
    );
    
    if (invoice_id) {
      // For invoice payment: Debit Cash/Bank, Credit Accounts Receivable
      // Find cash account
      let cashAccountId: string;
      const cashResult = await client.query(`
        SELECT id FROM accounts 
        WHERE (code = '1010' OR code = '1020' OR name ILIKE '%cash%' OR name ILIKE '%bank%') 
        AND type = 'Asset' 
        LIMIT 1
      `);
      
      if (cashResult.rows.length === 0) {
        const newId = uuidv4();
        await client.query(
          `INSERT INTO accounts (id, code, name, type, normal_balance, is_active)
           VALUES ($1, $2, $3, $4, $5, true)`,
          [newId, '1010', 'Cash', 'Asset', 'debit']
        );
        cashAccountId = newId;
      } else {
        cashAccountId = cashResult.rows[0].id;
      }
      
      // Find accounts receivable account
      let arAccountId: string;
      const arResult = await client.query(`
        SELECT id FROM accounts 
        WHERE code = '1040' AND type = 'Asset' 
        LIMIT 1
      `);
      
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
      
      // Debit: Cash/Bank
      await client.query(
        `INSERT INTO journal_entries (id, transaction_id, account_id, amount, type)
         VALUES ($1, $2, $3, $4, 'debit')`,
        [uuidv4(), transactionId, cashAccountId, amount]
      );
      
      // Credit: Accounts Receivable
      await client.query(
        `INSERT INTO journal_entries (id, transaction_id, account_id, amount, type)
         VALUES ($1, $2, $3, $4, 'credit')`,
        [uuidv4(), transactionId, arAccountId, amount]
      );
      
    } else if (bill_id) {
      // For bill payment: Debit Accounts Payable, Credit Cash/Bank
      // Find cash account
      let cashAccountId: string;
      const cashResult = await client.query(`
        SELECT id FROM accounts 
        WHERE (code = '1010' OR code = '1020' OR name ILIKE '%cash%' OR name ILIKE '%bank%') 
        AND type = 'Asset' 
        LIMIT 1
      `);
      
      if (cashResult.rows.length === 0) {
        const newId = uuidv4();
        await client.query(
          `INSERT INTO accounts (id, code, name, type, normal_balance, is_active)
           VALUES ($1, $2, $3, $4, $5, true)`,
          [newId, '1010', 'Cash', 'Asset', 'debit']
        );
        cashAccountId = newId;
      } else {
        cashAccountId = cashResult.rows[0].id;
      }
      
      // Find accounts payable account
      let apAccountId: string;
      const apResult = await client.query(`
        SELECT id FROM accounts 
        WHERE code = '2000' AND type = 'Liability' 
        LIMIT 1
      `);
      
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
      
      // Debit: Accounts Payable
      await client.query(
        `INSERT INTO journal_entries (id, transaction_id, account_id, amount, type)
         VALUES ($1, $2, $3, $4, 'debit')`,
        [uuidv4(), transactionId, apAccountId, amount]
      );
      
      // Credit: Cash/Bank
      await client.query(
        `INSERT INTO journal_entries (id, transaction_id, account_id, amount, type)
         VALUES ($1, $2, $3, $4, 'credit')`,
        [uuidv4(), transactionId, cashAccountId, amount]
      );
    }
    
    await client.query('COMMIT');
    
    return NextResponse.json({
      success: true,
      data: { paymentId, paymentNumber },
      message: 'Payment recorded successfully'
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error recording payment:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  } finally {
    client.release();
  }
}