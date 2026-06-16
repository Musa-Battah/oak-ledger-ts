import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const page = parseInt(searchParams.get('page') || '1');
    const offset = (page - 1) * limit;
    const entityType = searchParams.get('entityType');
    const action = searchParams.get('action');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    
    let sql = `
      SELECT 
        id,
        action,
        entity_type,
        entity_id,
        details,
        reason,
        created_at
      FROM audit_logs
      WHERE 1=1
    `;
    
    const params: any[] = [];
    let paramIndex = 1;
    
    if (entityType) {
      sql += ` AND entity_type = $${paramIndex}`;
      params.push(entityType);
      paramIndex++;
    }
    
    if (action) {
      sql += ` AND action = $${paramIndex}`;
      params.push(action);
      paramIndex++;
    }
    
    if (startDate) {
      sql += ` AND DATE(created_at) >= $${paramIndex}`;
      params.push(startDate);
      paramIndex++;
    }
    
    if (endDate) {
      sql += ` AND DATE(created_at) <= $${paramIndex}`;
      params.push(endDate);
      paramIndex++;
    }
    
    // Get total count
    const countSql = sql.replace(
      /SELECT .* FROM audit_logs/,
      'SELECT COUNT(*) as total FROM audit_logs'
    );
    const countResult = await query(countSql, params);
    const total = parseInt(countResult.rows[0].total);
    
    // Get paginated results
    sql += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);
    
    const result = await query(sql, params);
    
    return NextResponse.json({
      success: true,
      data: {
        logs: result.rows,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}