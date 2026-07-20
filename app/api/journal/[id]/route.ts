import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { ApiResponse } from '@/types';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse>> {
  try {
    const { id } = await params;

    const result = await query(
      `SELECT 
        mje.*,
        u.name as created_by_name,
        COALESCE(
          (SELECT SUM(amount) FROM manual_journal_entry_lines WHERE entry_id = mje.id AND type = 'debit'), 0
        ) as total_debits,
        COALESCE(
          (SELECT SUM(amount) FROM manual_journal_entry_lines WHERE entry_id = mje.id AND type = 'credit'), 0
        ) as total_credits
      FROM manual_journal_entries mje
      LEFT JOIN users u ON mje.created_by = u.id
      WHERE mje.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Journal entry not found'
      }, { status: 404 });
    }

    const entry = result.rows[0];

    const lines = await query(
      `SELECT 
        mjel.*, 
        a.name as account_name, 
        a.code as account_code,
        a.type as account_type,
        a.normal_balance
      FROM manual_journal_entry_lines mjel
      JOIN accounts a ON mjel.account_id = a.id
      WHERE mjel.entry_id = $1`,
      [id]
    );

    entry.lines = lines.rows;

    return NextResponse.json({
      success: true,
      data: entry
    });
  } catch (error) {
    console.error('Error fetching journal entry:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}