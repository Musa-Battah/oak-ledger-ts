import { NextRequest, NextResponse } from 'next/server';
import { query, withTransaction } from '@/lib/db';
import { getCurrentOrganizationId, getCurrentUser } from '@/lib/auth';
import { v4 as uuidv4 } from 'uuid';
import * as XLSX from 'xlsx';

interface ColumnMap {
  date: string | null;
  description: string | null;
  reference: string | null;
  accountName: string | null;
  accountType: string | null;
  debit: string | null;
  credit: string | null;
}

interface ImportEntry {
  row: number;
  date: Date;
  description: string;
  reference: string | null;
  account_name: string;
  account_type: string;
  account_id: string | null;
  debit: number;
  credit: number;
  isValid: boolean;
  errors: string[];
}

interface ValidatedGroup {
  groupKey: string;
  description: string;
  reference: string | null;
  date: Date;
  entries: ImportEntry[];
  totalDebit: number;
  totalCredit: number;
  isValid: boolean;
  errors: string[];
}

const ACCOUNT_TYPES = ['Asset', 'Liability', 'Equity', 'Revenue', 'Expense'];
const NORMAL_BALANCES: Record<string, string> = {
  Asset: 'debit',
  Liability: 'credit',
  Equity: 'credit',
  Revenue: 'credit',
  Expense: 'debit'
};

export async function POST(request: NextRequest) {
  try {
    const orgId = await getCurrentOrganizationId();
    const user = await getCurrentUser();
    
    if (!orgId || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const previewOnly = formData.get('preview') === 'true';
    
    if (!file) {
      return NextResponse.json({ success: false, error: 'No file provided' }, { status: 400 });
    }

    // Parse file
    const buffer = Buffer.from(await file.arrayBuffer());
    const extension = file.name.split('.').pop()?.toLowerCase();
    
    let data: any[];
    let headers: string[] = [];
    
    if (extension === 'xlsx' || extension === 'xls') {
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      data = XLSX.utils.sheet_to_json(sheet, { defval: '' });
      headers = Object.keys(data[0] || {});
    } else if (extension === 'csv') {
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      data = XLSX.utils.sheet_to_json(sheet, { defval: '' });
      headers = Object.keys(data[0] || {});
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

    console.log('📋 Headers found in file:', headers);
    console.log('📊 First row sample:', data[0]);

    // Column mapping
    const dateHeader = headers.find(h => h.trim().toLowerCase() === 'date');
    const descriptionHeader = headers.find(h => h.trim().toLowerCase() === 'description');
    const referenceHeader = headers.find(h => h.trim().toLowerCase() === 'reference');
    const accountNameHeader = headers.find(h => h.trim().toLowerCase() === 'account name');
    const accountTypeHeader = headers.find(h => h.trim().toLowerCase() === 'account type');
    const debitHeader = headers.find(h => h.trim().toLowerCase() === 'debit');
    const creditHeader = headers.find(h => h.trim().toLowerCase() === 'credit');

    const columnMap: ColumnMap = {
      date: dateHeader || headers.find(h => /date/i.test(h)) || null,
      description: descriptionHeader || headers.find(h => /description|desc|narrative/i.test(h)) || null,
      reference: referenceHeader || headers.find(h => /reference|ref/i.test(h)) || null,
      accountName: accountNameHeader || headers.find(h => /account name|account|ledger/i.test(h)) || null,
      accountType: accountTypeHeader || headers.find(h => /account type|type/i.test(h)) || null,
      debit: debitHeader || headers.find(h => /debit|dr/i.test(h)) || null,
      credit: creditHeader || headers.find(h => /credit|cr/i.test(h)) || null,
    };

    console.log('🔍 Column mapping:', columnMap);

    // Check required columns
    if (!columnMap.date) {
      return NextResponse.json({ success: false, error: 'Missing Date column', found: headers }, { status: 400 });
    }
    if (!columnMap.description) {
      return NextResponse.json({ success: false, error: 'Missing Description column', found: headers }, { status: 400 });
    }
    if (!columnMap.accountName) {
      return NextResponse.json({ success: false, error: 'Missing Account Name column', found: headers }, { status: 400 });
    }
    if (!columnMap.debit && !columnMap.credit) {
      return NextResponse.json({ success: false, error: 'Missing Debit or Credit column', found: headers }, { status: 400 });
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

    // Process entries - STEP 1: Parse all rows
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
      let accountType = '';
      let account = null;
      
      if (columnMap.accountName) {
        const nameValue = row[columnMap.accountName];
        if (nameValue !== undefined && nameValue !== null) {
          accountName = String(nameValue).trim();
          account = accountNameMap.get(accountName.toLowerCase());
        }
      }

      // Get account type from CSV if available
      if (columnMap.accountType) {
        const typeValue = row[columnMap.accountType];
        if (typeValue !== undefined && typeValue !== null) {
          accountType = String(typeValue).trim();
          accountType = accountType.charAt(0).toUpperCase() + accountType.slice(1).toLowerCase();
          if (!ACCOUNT_TYPES.includes(accountType)) {
            rowErrors.push(`Row ${rowNumber}: Invalid account type '${accountType}'. Must be Asset, Liability, Equity, Revenue, or Expense`);
          }
        }
      }

      // If account not found, create it
      if (!account) {
        let finalType = accountType;
        if (!finalType) {
          const lowerName = accountName.toLowerCase();
          if (lowerName.includes('expense') || lowerName.includes('cost') || lowerName.includes('salary') || lowerName.includes('rent') || lowerName.includes('utility') || lowerName.includes('supplies')) {
            finalType = 'Expense';
          } else if (lowerName.includes('revenue') || lowerName.includes('income') || lowerName.includes('sales') || lowerName.includes('service')) {
            finalType = 'Revenue';
          } else if (lowerName.includes('payable') || lowerName.includes('loan') || lowerName.includes('debt') || lowerName.includes('accrued')) {
            finalType = 'Liability';
          } else if (lowerName.includes('equity') || lowerName.includes('capital') || lowerName.includes('owner') || lowerName.includes('retained')) {
            finalType = 'Equity';
          } else {
            finalType = 'Asset';
          }
        }
        
        if (!ACCOUNT_TYPES.includes(finalType)) {
          finalType = 'Asset';
        }
        
        const newAccountId = uuidv4();
        const newAccountCode = `A${String(accountNameMap.size + 1).padStart(4, '0')}`;
        const normalBalance = NORMAL_BALANCES[finalType] || 'debit';
        
        await query(
          `INSERT INTO accounts (id, code, name, type, normal_balance, organization_id, is_active)
           VALUES ($1, $2, $3, $4, $5, $6, true)`,
          [newAccountId, newAccountCode, accountName, finalType, normalBalance, orgId]
        );
        
        account = {
          id: newAccountId,
          code: newAccountCode,
          name: accountName,
          type: finalType,
          normal_balance: normalBalance
        };
        accountNameMap.set(accountName.toLowerCase(), account);
        console.log(`✅ Created new account: ${newAccountCode} - ${accountName} (${finalType})`);
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
      
      // Fallback
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
        account_name: account?.name || accountName || '',
        account_type: account?.type || accountType || 'Asset',
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
          account_type: e.account_type,
          debit: e.debit,
          credit: e.credit
        }
      }));
      
      return NextResponse.json({
        success: false,
        error: `${invalidEntries.length} entries have validation errors`,
        errorDetails: errorDetails,
        errors: errors
      }, { status: 400 });
    }

    // STEP 2: Group by journal entry (date + description)
    const entryGroups = new Map<string, ImportEntry[]>();
    for (const entry of entries) {
      const key = `${entry.date.toISOString()}_${entry.description}`;
      if (!entryGroups.has(key)) {
        entryGroups.set(key, []);
      }
      entryGroups.get(key)!.push(entry);
    }

    // STEP 3: Validate each group is balanced
    const validatedGroups: ValidatedGroup[] = [];
    let allGroupsValid = true;

    for (const [key, groupEntries] of entryGroups) {
      const totalDebit = groupEntries.reduce((sum, e) => sum + e.debit, 0);
      const totalCredit = groupEntries.reduce((sum, e) => sum + e.credit, 0);
      const groupErrors: string[] = [];
      
      const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01;
      if (!isBalanced) {
        groupErrors.push(`Group "${groupEntries[0].description}" is not balanced. Debits: ${totalDebit}, Credits: ${totalCredit}`);
        allGroupsValid = false;
      }

      validatedGroups.push({
        groupKey: key,
        description: groupEntries[0].description,
        reference: groupEntries[0].reference,
        date: groupEntries[0].date,
        entries: groupEntries,
        totalDebit: totalDebit,
        totalCredit: totalCredit,
        isValid: isBalanced,
        errors: groupErrors
      });

      console.log(`📊 Group "${key}" - Debits: ${totalDebit}, Credits: ${totalCredit} - ${isBalanced ? '✅ Balanced' : '❌ Not Balanced'}`);
    }

    // If preview mode, return validation results without importing
    if (previewOnly) {
      return NextResponse.json({
        success: true,
        preview: true,
        groups: validatedGroups,
        summary: {
          totalGroups: validatedGroups.length,
          validGroups: validatedGroups.filter(g => g.isValid).length,
          invalidGroups: validatedGroups.filter(g => !g.isValid).length,
          allValid: allGroupsValid
        }
      });
    }

    // STEP 4: If any group is invalid, don't import
    if (!allGroupsValid) {
      const invalidGroups = validatedGroups.filter(g => !g.isValid);
      return NextResponse.json({
        success: false,
        error: `${invalidGroups.length} journal entries are not balanced`,
        invalidGroups: invalidGroups.map(g => ({
          description: g.description,
          totalDebit: g.totalDebit,
          totalCredit: g.totalCredit,
          difference: g.totalDebit - g.totalCredit
        })),
        message: 'Please fix the unbalanced entries and try again.'
      }, { status: 400 });
    }

    // STEP 5: All groups are valid - proceed with import
    let imported = 0;

    await withTransaction(async (client) => {
      for (const group of validatedGroups) {
        const firstEntry = group.entries[0];
        const entryNumber = `IMP-${Date.now()}-${imported + 1}`;
        const entryId = uuidv4();

        // Create journal entry
        await client.query(
          `INSERT INTO manual_journal_entries (
            id, entry_number, date, description, reference, status, created_by, organization_id
          ) VALUES ($1, $2, $3, $4, $5, 'posted', $6, $7)`,
          [entryId, entryNumber, firstEntry.date, firstEntry.description, firstEntry.reference, user.id, orgId]
        );

        // Insert lines - NO TRIGGER TO WORRY ABOUT
        for (const entry of group.entries) {
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
        for (const entry of group.entries) {
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

        await client.query(
          `INSERT INTO audit_logs (id, action, entity_type, entity_id, details, created_at)
           VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)`,
          [uuidv4(), 'IMPORT', 'journal_entry', entryId, JSON.stringify({ entryNumber, lines: group.entries.length })]
        );

        imported++;
      }
    });

    return NextResponse.json({
      success: true,
      message: `Successfully imported ${imported} journal entries`,
      imported: imported,
      totalGroups: validatedGroups.length,
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