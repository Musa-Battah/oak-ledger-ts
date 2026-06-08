import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { Account, ApiResponse } from '@/types';
import { v4 as uuidv4 } from 'uuid';

export async function GET(): Promise<NextResponse<ApiResponse<{ accounts: Account[]; totals: Record<string, number> }>>> {
  try {
    const result = await query<Account>(`
      SELECT a.*, p.name as parent_name, p.code as parent_code
      FROM accounts a
      LEFT JOIN accounts p ON a.parent_account_id = p.id
      WHERE a.is_active = true
      ORDER BY a.code
    `);
    
    const totals: Record<string, number> = {
      Asset: 0,
      Liability: 0,
      Equity: 0,
      Revenue: 0,
      Expense: 0
    };
    
    result.rows.forEach(account => {
      totals[account.type] += Number(account.balance);
    });
    
    return NextResponse.json({
      success: true,
      data: {
        accounts: result.rows,
        totals
      }
    });
  } catch (error) {
    console.error('Error fetching accounts:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse>> {
  try {
    const body = await request.json();
    const { code, name, type, normal_balance, parent_account_id, description } = body;
    
    if (!code || !name || !type || !normal_balance) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: code, name, type, normal_balance'
      }, { status: 400 });
    }
    
    const existing = await query('SELECT id FROM accounts WHERE code = $1', [code]);
    if (existing.rows.length > 0) {
      return NextResponse.json({
        success: false,
        error: `Account code ${code} already exists`
      }, { status: 400 });
    }
    
    const id = uuidv4();
    const result = await query(
      `INSERT INTO accounts (id, code, name, type, normal_balance, parent_account_id, description, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, true)
       RETURNING *`,
      [id, code, name, type, normal_balance, parent_account_id || null, description || null]
    );
    
    return NextResponse.json({
      success: true,
      data: result.rows[0],
      message: `Account ${code} - ${name} created successfully`
    });
  } catch (error) {
    console.error('Error creating account:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}