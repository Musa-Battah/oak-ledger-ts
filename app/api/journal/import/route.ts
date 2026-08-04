import { NextRequest, NextResponse } from 'next/server';
import { query, withTransaction } from '@/lib/db';
import { getCurrentOrganizationId, getCurrentUser } from '@/lib/auth';
import { v4 as uuidv4 } from 'uuid';
import * as XLSX from 'xlsx';

interface ColumnMap {
  date: string | null;
  description: string | null;
  reference: string | null;
  accountCode: string | null;
  accountName: string | null;
  debit: string | null;
  credit: string | null;
}

interface ImportEntry {
  row: number;
  date: Date;
  description: string;
  reference: string | null;
  account_code: string;
  account_name: string;
  account_id: string | null;
  debit: number;
  credit: number;
  isValid: boolean;
  errors: string[];
}

interface EntryGroup {
  [key: string]: ImportEntry[];
}

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

    // Get headers
    const headers = Object.keys(data[0]);
    console.log('📋 Headers found in file:', headers);

    // Column mapping
    const dateHeader = headers.find(h => /^date$/i.test(h)) || headers.find(h => /date/i.test(h));
    const descriptionHeader = headers.find(h => /^description$/i.test(h)) || headers.find(h => /description|desc|narrative/i.test(h));
    const referenceHeader = headers.find(h => /^reference$/i.test(h)) || headers.find(h => /reference|ref/i.test(h));
    const accountNameHeader = headers.find(h => /^account name$/i.test(h)) || headers.find(h => /account name|account|ledger/i.test(h));
    const debitHeader = headers.find(h => /^debit$/i.test(h)) || headers.find(h => /debit|dr/i.test(h));
    const creditHeader = headers.find(h => /^credit$/i.test(h)) || headers.find(h => /credit|cr/i.test(h));

    const columnMap: ColumnMap = {
      date: dateHeader || null,
      description: descriptionHeader || null,
      reference: referenceHeader || null,
      accountCode: null,
      accountName: accountNameHeader || null,
      debit: debitHeader || null,
      credit: creditHeader || null,
    };

    console.log('🔍 Column mapping:', columnMap);

    // Check required columns
    if (!columnMap.date) {
      return NextResponse.json({
        success: false,
        error: 'Missing Date column',
        found: headers
      }, { status: 400 });
    }

    if (!columnMap.description) {
      return NextResponse.json({
        success: false,
        error: 'Missing Description column',
        found: headers
      }, { status: 400 });
    }

    if (!columnMap.accountName) {
      return NextResponse.json({
        success: false,
        error: 'Missing Account Name column',
        found: headers
      }, { status: 400 });
    }

    // Check if either debit or credit exists
    if (!columnMap.debit && !columnMap.credit) {
      return NextResponse.json({
        success: false,
        error: 'Missing both Debit and Credit columns. Need at least one.',
        found: headers
      }, { status: 400 });
    }

    // Get existing accounts
    const accountsResult = await query(
      'SELECT code, id, name, type, normal_balance FROM accounts WHERE organization_id = $1',
      [orgId]
    );
    const accountNameMap = new Map<string, any>();
    accountsResult.rows.forEach(a => {
      accountNameMap.set(a.name.toLowerCase(), a);
    });

    // Process entries
    const entries: ImportEntry[] = [];
    const errors: string[] = [];
    let rowNumber = 2;

    for (const row of data) {
      const rowErrors: string[] = [];
      
      // Get date
      const dateStr = row[columnMap.date as string];
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

      // Get description
      const description = row[columnMap.description as string] ? String(row[columnMap.description as string]).trim() : '';
      if (!description) {
        rowErrors.push(`Row ${rowNumber}: Description is required`);
      }

      // Get account name
      let accountName = '';
      let account = null;
      
      if (columnMap.accountName) {
        const nameValue = row[columnMap.accountName];
        if (nameValue !== undefined && nameValue !== null) {
          accountName = String(nameValue).trim();
          account = accountNameMap.get(accountName.toLowerCase());
          if (!account) {
            for (const [key, value] of accountNameMap) {
              if (accountName.toLowerCase().includes(key) || key.includes(accountName.toLowerCase())) {
                account = value;
                break;
              }
            }
          }
        }
      }

      // If account not found, create it
      if (!account) {
        const newAccountId = uuidv4();
        const newAccountCode = `A${String(accountNameMap.size + 1).padStart(4, '0')}`;
        
        await query(
          `INSERT INTO accounts (id, code, name, type, normal_balance, organization_id, is_active)
           VALUES ($1, $2, $3, 'Asset', 'debit', $4, true)`,
          [newAccountId, newAccountCode, accountName || 'Unnamed Account', orgId]
        );
        
        account = {
          id: newAccountId,
          code: newAccountCode,
          name: accountName || 'Unnamed Account',
          type: 'Asset',
          normal_balance: 'debit'
        };
        accountNameMap.set(accountName.toLowerCase(), account);
        console.log(`✅ Created new account: ${newAccountCode} - ${accountName}`);
      }

      // Get debit and credit
      let debit = 0;
      let credit = 0;
      
      if (columnMap.debit) {
        const debitValue = row[columnMap.debit];
        if (debitValue !== undefined && debitValue !== null && debitValue !== '') {
          const cleanDebit = String(debitValue).replace(/,/g, '').replace(/₦/g, '').trim();
          debit = parseFloat(cleanDebit) || 0;
        }
      }
      
      if (columnMap.credit) {
        const creditValue = row[columnMap.credit];
        if (creditValue !== undefined && creditValue !== null && creditValue !== '') {
          const cleanCredit = String(creditValue).replace(/,/g, '').replace(/₦/g, '').trim();
          credit = parseFloat(cleanCredit) || 0;
        }
      }
      
      // Fallback: try reading Credit directly from row
      if (credit === 0 && row['Credit'] !== undefined && row['Credit'] !== null && row['Credit'] !== '') {
        const cleanCredit = String(row['Credit']).replace(/,/g, '').replace(/₦/g, '').trim();
        credit = parseFloat(cleanCredit) || 0;
      }
      
      // Validation
      if (debit < 0 || credit < 0) {
        rowErrors.push(`Row ${rowNumber}: Amounts must be positive`);
      }
      
      if (debit > 0 && credit > 0) {
        rowErrors.push(`Row ${rowNumber}: Cannot have both debit and credit in the same row`);
      }
      
      if (debit === 0 && credit === 0) {
        rowErrors.push(`Row ${rowNumber}: Either debit or credit amount is required`);
      }

      // Get reference
      let reference: string | null = null;
      if (columnMap.reference) {
        const refValue = row[columnMap.reference];
        if (refValue !== undefined && refValue !== null) {
          reference = String(refValue).trim() || null;
        }
      }

      const entry: ImportEntry = {
        row: rowNumber,
        date: parsedDate,
        description: description || '',
        reference: reference,
        account_code: account?.code || '',
        account_name: account?.name || '',
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
      const errorDetails = invalidEntries.map(e => ({
        row: e.row,
        errors: e.errors,
        data: {
          date: e.date.toISOString().split('T')[0],
          description: e.description,
          account_name: e.account_name,
          debit: e.debit,
          credit: e.credit
        }
      }));
      
      return NextResponse.json({
        success: false,
        error: `${invalidEntries.length} entries have validation errors`,
        message: 'Please fix the errors below and try again',
        errorDetails: errorDetails,
        errors: errors
      }, { status: 400 });
    }

    // Group by journal entry (date + description)
    const entryGroups: EntryGroup = {};
    for (const entry of entries) {
      const key = `${entry.date.toISOString()}_${entry.description}`;
      if (!entryGroups[key]) {
        entryGroups[key] = [];
      }
      entryGroups[key].push(entry);
    }

    // Check balance for each group
    for (const [key, group] of Object.entries(entryGroups)) {
      const totalDebit = group.reduce((sum, e) => sum + e.debit, 0);
      const totalCredit = group.reduce((sum, e) => sum + e.credit, 0);
      if (Math.abs(totalDebit - totalCredit) > 0.01) {
        return NextResponse.json({
          success: false,
          error: `Journal entry "${key}" is not balanced`,
          message: `Debits: ${totalDebit}, Credits: ${totalCredit}. They must be equal.`,
          entries: entries
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

        // Insert manual journal entry
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
              id, entry_id, account_id, amount, type, organization_id
            ) VALUES ($1, $2, $3, $4, $5, $6)`,
            [lineId, entryId, entry.account_id, amount, type, orgId]
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

            let newBalance: number;
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

        // Log audit - WITHOUT organization_id since it doesn't exist
        await client.query(
          `INSERT INTO audit_logs (id, action, entity_type, entity_id, details, created_at)
           VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)`,
          [uuidv4(), 'IMPORT', 'journal_entry', entryId, JSON.stringify({ entryNumber, lines: group.length })]
        );

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