import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { Customer, ApiResponse } from '@/types';
import { v4 as uuidv4 } from 'uuid';

export async function GET(): Promise<NextResponse<ApiResponse<Customer[]>>> {
  try {
    const result = await query<Customer>(`
      SELECT c.*, 
        COUNT(i.id) as invoice_count,
        COALESCE(SUM(CASE WHEN i.status = 'paid' THEN i.total ELSE 0 END), 0) as total_paid,
        COALESCE(SUM(CASE WHEN i.status IN ('sent', 'overdue') THEN i.total ELSE 0 END), 0) as outstanding
      FROM customers c
      LEFT JOIN invoices i ON c.id = i.customer_id
      GROUP BY c.id
      ORDER BY c.name
    `);
    
    return NextResponse.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching customers:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse<Customer>>> {
  try {
    const { name, email, phone, address } = await request.json();
    
    if (!name) {
      return NextResponse.json({
        success: false,
        error: 'Customer name is required'
      }, { status: 400 });
    }
    
    const id = uuidv4();
    await query(
      `INSERT INTO customers (id, name, email, phone, address)
       VALUES ($1, $2, $3, $4, $5)`,
      [id, name, email || null, phone || null, address || null]
    );
    
    const result = await query<Customer>('SELECT * FROM customers WHERE id = $1', [id]);
    
    return NextResponse.json({
      success: true,
      data: result.rows[0],
      message: `Customer ${name} created successfully`
    });
  } catch (error) {
    console.error('Error creating customer:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}