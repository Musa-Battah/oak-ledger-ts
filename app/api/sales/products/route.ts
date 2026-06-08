import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { Product, ApiResponse } from '@/types';
import { v4 as uuidv4 } from 'uuid';

export async function GET(): Promise<NextResponse<ApiResponse<Product[]>>> {
  try {
    const result = await query<Product>(`
      SELECT * FROM products 
      WHERE is_active = true 
      ORDER BY name
    `);
    
    return NextResponse.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching products:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse<Product>>> {
  try {
    const { name, description, sku, unit_price, cost } = await request.json();
    
    // Name is required
    if (!name) {
      return NextResponse.json({
        success: false,
        error: 'Product name is required'
      }, { status: 400 });
    }
    
    // Unit price is required for new products
    if (unit_price === undefined || unit_price === null || unit_price < 0) {
      return NextResponse.json({
        success: false,
        error: 'Selling price (unit_price) is required'
      }, { status: 400 });
    }
    
    const id = uuidv4();
    await query(
      `INSERT INTO products (id, name, description, sku, unit_price, cost, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, true)`,
      [id, name, description || null, sku || null, unit_price, cost || null]
    );
    
    const result = await query<Product>('SELECT * FROM products WHERE id = $1', [id]);
    
    return NextResponse.json({
      success: true,
      data: result.rows[0],
      message: `Product ${name} created successfully`
    });
  } catch (error) {
    console.error('Error creating product:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}