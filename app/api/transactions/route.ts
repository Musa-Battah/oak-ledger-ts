import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { Transaction, ApiResponse } from '@/types';

export async function GET(request: NextRequest): Promise<NextResponse<ApiResponse<Transaction[]>>> {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '100');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const type = searchParams.get('type');
    
    let sql = `
      SELECT 
        t.*,
        json_agg(json_build_object(
          'account_name', a.name,
          'account_code', a.code,
          'amount', je.amount,
          'type', je.type
        )) as entries
      FROM transactions t
      LEFT JOIN journal_entries je ON t.id = je.transaction_id
      LEFT JOIN accounts a ON je.account_id = a.id
      WHERE 1=1
    `;
    
    const params: any[] = [];
    let paramIndex = 1;
    
    if (startDate) {
      sql += ` AND t.date >= $${paramIndex}`;
      params.push(startDate);
      paramIndex++;
    }
    
    if (endDate) {
      sql += ` AND t.date <= $${paramIndex}`;
      params.push(endDate);
      paramIndex++;
    }
    
    if (type) {
      sql += ` AND t.type = $${paramIndex}`;
      params.push(type);
      paramIndex++;
    }
    
    sql += ` GROUP BY t.id ORDER BY t.date DESC LIMIT $${paramIndex}`;
    params.push(limit);
    
    const result = await query(sql, params);
    
    return NextResponse.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching transactions:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}