import { NextRequest, NextResponse } from 'next/server';
import { query, withTransaction } from '@/lib/db';
import { getCurrentOrganizationId, getCurrentUser } from '@/lib/auth';
import { v4 as uuidv4 } from 'uuid';
import * as XLSX from 'xlsx';

export async function POST(request: NextRequest) {
  try {
    const orgId = await getCurrentOrganizationId();
    const user = await getCurrentUser();
    
    if (!orgId || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ success: false, error: 'No file provided' }, { status: 400 });
    }

    // Parse file
    const buffer = Buffer.from(await file.arrayBuffer());
    const extension = file.name.split('.').pop()?.toLowerCase();
    
    let data: any[];
    if (extension === 'xlsx' || extension === 'xls') {
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      data = XLSX.utils.sheet_to_json(sheet);
    } else if (extension === 'csv') {
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      data = XLSX.utils.sheet_to_json(sheet);
    } else {
      return NextResponse.json({ 
        success: false, 
        error: 'Unsupported file format. Use .csv, .xlsx, or .xls' 
      }, { status: 400 });
    }

    if (!data || data.length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'No data found in file' 
      }, { status: 400 });
    }

    // Flexible column mapping
    const headers = Object.keys(data[0]);
    
    const columnMap = {
      date: headers.find(h => /date/i.test(h)) || null,
      description: headers.find(h => /description|desc|narrative/i.test(h)) || null,
      reference: headers.find(h => /reference|ref|number|no/i.test(h)) || null,
      accountCode: headers.find(h => /account.?code|code|account no|account/i.test(h)) || null,
      debit: headers.find(h => /debit|dr/i.test(h)) || null,
      credit: headers.find(h => /credit|cr/i.test(h)) || null,
    };

    // Check required columns
    const requiredFields = ['date', 'description', 'accountCode'];
    const missingFields = requiredFields.filter(f => !columnMap[f]);
    
    if (missingFields.length > 0) {
      return NextResponse.json({
        success: false,
        error: `Missing required columns: ${missingFields.join(', ')}`,
        required: requiredFields,
        found: headers,
        columnMap: columnMap
      }, { status: 400 });
    }

    // Check if either debit or credit column exists
    if (!columnMap.debit && !columnMap.credit) {
      return NextResponse.json({
        success: false,
        error: 'Missing either Debit or Credit column',
        found: headers
      }, { status: 400 });
    }

    // Get accounts for validation
    const accountsResult = await query(
      'SELECT code, id, name, type FROM accounts WHERE organization_id = $1 AND is_active = true',
      [orgId]
    );
    const accountMap = new Map();
    accountsResult.rows.forEach(a => accountMap.set(a.code, a));

    // Process entries
    const entries = [];
    const errors = [];
    let rowNumber = 2;

    for (const row of data) {
      const rowErrors = [];
      
      // Get values using column map - handle undefined and type conversion
      const dateStr = row[columnMap.date];
      let parsedDate: Date;
      if (dateStr === undefined || dateStr === null || dateStr === '') {
        rowErrors.push(`Row ${rowNumber}: Date is required`);
        parsedDate = new Date();
      } else if (typeof dateStr === 'number') {
        parsedDate = new Date((dateStr - 25569) * 86400 * 1000);
      } else {
        parsedDate = new Date(dateStr);
      }
      
      if (isNaN(parsedDate.getTime())) {
        rowErrors.push(`Row ${rowNumber}: Invalid date format. Use YYYY-MM-DD`);
      }

      const description = row[columnMap.description] ? String(row[columnMap.description]).trim() : '';
      if (!description) {
        rowErrors.push(`Row ${rowNumber}: Description is required`);
      }

      // Handle account code - convert to string
      let accountCode = '';
      if (row[columnMap.accountCode] !== undefined && row[columnMap.accountCode] !== null) {
        accountCode = String(row[columnMap.accountCode]).trim();
      }
      
      const account = accountMap.get(accountCode);
      if (!accountCode) {
        rowErrors.push(`Row ${rowNumber}: Account code is required`);
      } else if (!account) {
        rowErrors.push(`Row ${rowNumber}: Account code '${accountCode}' not found`);
      }

      // Get debit and credit values - handle undefined
      let debit = 0;
      let credit = 0;
      
      if (columnMap.debit && row[columnMap.debit] !== undefined && row[columnMap.debit] !== null && row[columnMap.debit] !== '') {
        debit = parseFloat(String(row[columnMap.debit]).replace(/,/g, '')) || 0;
      }
      if (columnMap.credit && row[columnMap.credit] !== undefined && row[columnMap.credit] !== null && row[columnMap.credit] !== '') {
        credit = parseFloat(String(row[columnMap.credit]).replace(/,/g, '')) || 0;
      }
      
      if (debit < 0 || credit < 0) {
        rowErrors.push(`Row ${rowNumber}: Debit and credit amounts must be positive`);
      }
      
      if (debit > 0 && credit > 0) {
        rowErrors.push(`Row ${rowNumber}: Cannot have both debit and credit in the same row`);
      }
      
      if (debit === 0 && credit === 0) {
        rowErrors.push(`Row ${rowNumber}: Either debit or credit amount is required`);
      }

      // Get reference
      let reference = null;
      if (columnMap.reference && row[columnMap.reference] !== undefined && row[columnMap.reference] !== null) {
        reference = String(row[columnMap.reference]).trim() || null;
      }

      const entry = {
        row: rowNumber,
        date: parsedDate,
        description: description || '',
        reference: reference,
        account_code: accountCode,
        account_id: account?.id || null,
        debit: debit,
        credit: credit,
        isValid: rowErrors.length === 0,
        errors: rowErrors
      };

      entries.push(entry);
      if (rowErrors.length > 0) {
        errors.push(...rowErrors);
      }
      rowNumber++;
    }

    // Check if any entries are invalid
    const invalidEntries = entries.filter(e => !e.isValid);
    if (invalidEntries.length > 0) {
      return NextResponse.json({
        success: false,
        error: `${invalidEntries.length} entries have validation errors`,
        entries: entries,
        errors: errors
      }, { status: 400 });
    }

    // Check if each entry group balances
    const entryGroups = {};
    for (const entry of entries) {
      const key = `${entry.date.toISOString()}_${entry.description}`;
      if (!entryGroups[key]) {
        entryGroups[key] = [];
      }
      entryGroups[key].push(entry);
    }

    for (const [key, group] of Object.entries(entryGroups)) {
      const totalDebit = group.reduce((sum, e) => sum + e.debit, 0);
      const totalCredit = group.reduce((sum, e) => sum + e.credit, 0);
      if (Math.abs(totalDebit - totalCredit) > 0.01) {
        return NextResponse.json({
          success: false,
          error: `Journal entry "${key}" is not balanced. Debits: ${totalDebit}, Credits: ${totalCredit}`,
          entries: entries,
          errors: [`Journal entry "${key}" is not balanced`]
        }, { status: 400 });
      }
    }

    // Process the import
    let imported = 0;

    await withTransaction(async (client) => {
      for (const [key, group] of Object.entries(entryGroups)) {
        const firstEntry = group[0];
        const entryNumber = `IMP-${Date.now()}-${imported + 1}`;
        const entryId = uuidv4();

        await client.query(
          `INSERT INTO manual_journal_entries (
            id, entry_number, date, description, reference, status, created_by, organization_id
          ) VALUES ($1, $2, $3, $4, $5, 'posted', $6, $7)`,
          [entryId, entryNumber, firstEntry.date, firstEntry.description, firstEntry.reference, user.id, orgId]
        );

        for (const entry of group) {
          const lineId = uuidv4();
          const amount = entry.debit || entry.credit;
          const type = entry.debit > 0 ? 'debit' : 'credit';

          await client.query(
            `INSERT INTO manual_journal_entry_lines (
              id, entry_id, account_id, amount, type
            ) VALUES ($1, $2, $3, $4, $5)`,
            [lineId, entryId, entry.account_id, amount, type]
          );

          // Update account balance
          const account = await client.query(
            'SELECT balance, normal_balance FROM accounts WHERE id = $1',
            [entry.account_id]
          );

          if (account.rows.length > 0) {
            const currentBalance = parseFloat(account.rows[0].balance);
            const isDebit = type === 'debit';
            const normalBalanceDebit = account.rows[0].normal_balance === 'debit';

            let newBalance;
            if (isDebit) {
              newBalance = normalBalanceDebit ? currentBalance + amount : currentBalance - amount;
            } else {
              newBalance = normalBalanceDebit ? currentBalance - amount : currentBalance + amount;
            }

            await client.query(
              'UPDATE accounts SET balance = $1 WHERE id = $2',
              [newBalance, entry.account_id]
            );
          }
        }

        // Create transaction record
        const transactionId = uuidv4();
        await client.query(
          `INSERT INTO transactions (
            id, date, description, reference_number, type, source_type, source_id, status, organization_id
          ) VALUES ($1, $2, $3, $4, 'journal', 'manual', $5, 'posted', $6)`,
          [transactionId, firstEntry.date, `Import ${entryNumber}`, entryNumber, entryId, orgId]
        );

        // Create journal entries for reporting
        for (const entry of group) {
          const jeId = uuidv4();
          const amount = entry.debit || entry.credit;
          const type = entry.debit > 0 ? 'debit' : 'credit';

          await client.query(
            `INSERT INTO journal_entries (
              id, transaction_id, account_id, amount, type, organization_id
            ) VALUES ($1, $2, $3, $4, $5, $6)`,
            [jeId, transactionId, entry.account_id, amount, type, orgId]
          );
        }

        imported++;
      }
    });

    return NextResponse.json({
      success: true,
      message: `Successfully imported ${imported} journal entries`,
      imported: imported,
      entries: entries
    });
  } catch (error) {
    console.error('Import error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Import failed'
    }, { status: 500 });
  }
}