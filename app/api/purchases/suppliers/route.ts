import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { Supplier, ApiResponse } from '@/types';
import { v4 as uuidv4 } from 'uuid';

export async function GET(): Promise<NextResponse<ApiResponse<Supplier[]>>> {
  try {
    const result = await query<Supplier>(`
      SELECT s.*, 
        COUNT(b.id) as bill_count,
        COALESCE(SUM(CASE WHEN b.status = 'paid' THEN b.total ELSE 0 END), 0) as total_paid,
        COALESCE(SUM(CASE WHEN b.status IN ('received', 'overdue') THEN b.total ELSE 0 END), 0) as outstanding
      FROM suppliers s
      LEFT JOIN bills b ON s.id = b.supplier_id
      GROUP BY s.id
      ORDER BY s.name
    `);
    
    return NextResponse.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching suppliers:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse<Supplier>>> {
  try {
    const { name, email, phone, address } = await request.json();
    
    if (!name) {
      return NextResponse.json({
        success: false,
        error: 'Supplier name is required'
      }, { status: 400 });
    }
    
    const id = uuidv4();
    await query(
      `INSERT INTO suppliers (id, name, email, phone, address)
       VALUES ($1, $2, $3, $4, $5)`,
      [id, name, email || null, phone || null, address || null]
    );
    
    const result = await query<Supplier>('SELECT * FROM suppliers WHERE id = $1', [id]);
    
    return NextResponse.json({
      success: true,
      data: result.rows[0],
      message: `Supplier ${name} created successfully`
    });
  } catch (error) {
    console.error('Error creating supplier:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}