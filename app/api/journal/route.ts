import { NextRequest, NextResponse } from 'next/server';
import { query, withTransaction } from '@/lib/db';
import { ManualJournalEntry, ApiResponse } from '@/types';
import { v4 as uuidv4 } from 'uuid';
import { getCurrentUser, getCurrentOrganizationId } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const orgId = await getCurrentOrganizationId();
    if (!orgId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const page = parseInt(searchParams.get('page') || '1');
    const offset = (page - 1) * limit;
    const status = searchParams.get('status');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    let sql = `
      SELECT 
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
      WHERE mje.organization_id = $1
    `;

    const params: any[] = [orgId];
    let paramIndex = 2;

    if (status) {
      sql += ` AND mje.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    if (startDate) {
      sql += ` AND mje.date >= $${paramIndex}`;
      params.push(startDate);
      paramIndex++;
    }

    if (endDate) {
      sql += ` AND mje.date <= $${paramIndex}`;
      params.push(endDate);
      paramIndex++;
    }

    sql += ` ORDER BY mje.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const countResult = await query(
      'SELECT COUNT(*) as total FROM manual_journal_entries WHERE organization_id = $1',
      [orgId]
    );

    const result = await query(sql, params);

    // Get lines for each entry - include account names
    for (const entry of result.rows) {
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
        [entry.id]
      );
      entry.lines = lines.rows;
    }

    return NextResponse.json({
      success: true,
      data: {
        entries: result.rows,
        pagination: {
          page,
          limit,
          total: parseInt(countResult.rows[0].total),
          totalPages: Math.ceil(countResult.rows[0].total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Error fetching journal entries:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const orgId = await getCurrentOrganizationId();
    const user = await getCurrentUser();
    
    if (!orgId || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { date, description, reference, lines } = body;

    // Validate
    if (!date || !description || !lines || lines.length < 2) {
      return NextResponse.json({
        success: false,
        error: 'Date, description, and at least 2 lines are required'
      }, { status: 400 });
    }

    // Validate balance
    const totalDebits = lines
      .filter((l: any) => l.type === 'debit')
      .reduce((sum: number, l: any) => sum + l.amount, 0);
    const totalCredits = lines
      .filter((l: any) => l.type === 'credit')
      .reduce((sum: number, l: any) => sum + l.amount, 0);

    if (Math.abs(totalDebits - totalCredits) > 0.01) {
      return NextResponse.json({
        success: false,
        error: 'Total debits must equal total credits'
      }, { status: 400 });
    }

    const entryNumber = `JE-${Date.now()}`;
    const entryId = uuidv4();

    const result = await withTransaction(async (client) => {
      // Insert journal entry
      await client.query(
        `INSERT INTO manual_journal_entries (id, entry_number, date, description, reference, status, created_by, organization_id)
         VALUES ($1, $2, $3, $4, $5, 'posted', $6, $7)`,
        [entryId, entryNumber, date, description, reference || null, user.id, orgId]
      );

      // Insert lines
      for (const line of lines) {
        const lineId = uuidv4();
        await client.query(
          `INSERT INTO manual_journal_entry_lines (id, entry_id, account_id, amount, type, description)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [lineId, entryId, line.account_id, line.amount, line.type, line.description || null]
        );

        // Update account balance
        const account = await client.query(
          'SELECT balance, normal_balance FROM accounts WHERE id = $1',
          [line.account_id]
        );

        if (account.rows.length === 0) {
          throw new Error(`Account ${line.account_id} not found`);
        }

        const currentBalance = parseFloat(account.rows[0].balance);
        const isDebit = line.type === 'debit';
        const normalBalanceDebit = account.rows[0].normal_balance === 'debit';

        let newBalance;
        if (isDebit) {
          newBalance = normalBalanceDebit ? currentBalance + line.amount : currentBalance - line.amount;
        } else {
          newBalance = normalBalanceDebit ? currentBalance - line.amount : currentBalance + line.amount;
        }

        await client.query(
          'UPDATE accounts SET balance = $1 WHERE id = $2',
          [newBalance, line.account_id]
        );
      }

      // Create transaction record for audit
      const transactionId = uuidv4();
      await client.query(
        `INSERT INTO transactions (id, date, description, reference_number, type, source_type, source_id, status, organization_id)
         VALUES ($1, $2, $3, $4, 'journal', 'manual', $5, 'posted', $6)`,
        [transactionId, date, `Journal Entry ${entryNumber}`, entryNumber, entryId, orgId]
      );

      // Create journal entries in the main journal_entries table for reporting
      for (const line of lines) {
        const jeId = uuidv4();
        await client.query(
          `INSERT INTO journal_entries (id, transaction_id, account_id, amount, type, organization_id)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [jeId, transactionId, line.account_id, line.amount, line.type, orgId]
        );
      }

      // Log audit
      await client.query(
        `INSERT INTO audit_logs (id, action, entity_type, entity_id, details, created_at, organization_id)
         VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, $6)`,
        [uuidv4(), 'CREATE', 'journal_entry', entryId, JSON.stringify({ entryNumber, lines: lines.length }), orgId]
      );

      return { entryId, entryNumber };
    });

    return NextResponse.json({
      success: true,
      data: result,
      message: 'Journal entry created successfully'
    });
  } catch (error) {
    console.error('Error creating journal entry:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}