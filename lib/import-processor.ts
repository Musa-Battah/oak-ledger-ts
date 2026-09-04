import { AccountingEngine } from './accounting-engine';
import { AccountManager } from './account-manager';
import * as XLSX from 'xlsx';

interface ImportRow {
  date: string;
  description: string;
  reference?: string;
  account_name: string;
  account_type?: string;
  debit?: number;
  credit?: number;
}

export class ImportProcessor {
  /**
   * Process imported journal entries with smart account management
   */
  static async processImport(
    data: any[],
    organization_id: string,
    user_id: string
  ): Promise<{ success: boolean; imported: number; errors: string[] }> {
    const errors: string[] = [];
    let imported = 0;

    // Group rows by description (each group is one journal entry)
    const groups: Record<string, ImportRow[]> = {};
    
    for (const row of data) {
      const key = row['Description'] || row['description'] || 'Unnamed';
      if (!groups[key]) {
        groups[key] = [];
      }
      
      groups[key].push({
        date: row['Date'] || row['date'],
        description: key,
        reference: row['Reference'] || row['reference'] || null,
        account_name: row['Account Name'] || row['account_name'] || row['Account'],
        account_type: row['Account Type'] || row['account_type'] || undefined,
        debit: parseFloat(row['Debit'] || row['debit'] || 0) || 0,
        credit: parseFloat(row['Credit'] || row['credit'] || 0) || 0
      });
    }

    // Process each group
    for (const [key, lines] of Object.entries(groups)) {
      try {
        // Check if entry is balanced
        const totalDebits = lines.reduce((sum, l) => sum + (l.debit || 0), 0);
        const totalCredits = lines.reduce((sum, l) => sum + (l.credit || 0), 0);
        
        if (Math.abs(totalDebits - totalCredits) > 0.01) {
          errors.push(`Entry "${key}" is not balanced: Debits ${totalDebits}, Credits ${totalCredits}`);
          continue;
        }

        // Process each line
        const processedLines = [];
        for (const line of lines) {
          const accountId = await AccountManager.findOrCreateAccount(
            line.account_name,
            organization_id
          );
          
          const type = line.debit && line.debit > 0 ? 'debit' : 'credit';
          const amount = line.debit || line.credit || 0;
          
          processedLines.push({
            account_id: accountId,
            amount,
            type,
            description: line.description || line.account_name
          });
        }

        // Create journal entry
        await AccountingEngine.processJournalEntry({
          date: new Date(lines[0].date),
          description: key,
          reference: lines[0].reference,
          lines: processedLines.map(l => ({
            account_name: l.account_id, // This will be handled differently
            amount: l.amount,
            type: l.type as 'debit' | 'credit',
            description: l.description
          })),
          organization_id,
          user_id
        });

        imported++;
      } catch (error) {
        errors.push(`Error processing "${key}": ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return {
      success: errors.length === 0,
      imported,
      errors
    };
  }
}