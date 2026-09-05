import { query, withTransaction } from './db';
import { v4 as uuidv4 } from 'uuid';

type AccountType = 'Asset' | 'Liability' | 'Equity' | 'Revenue' | 'Expense';

interface Account {
  id: string;
  code: string;
  name: string;
  type: AccountType;
  normal_balance: 'debit' | 'credit';
}

interface JournalLine {
  account_name: string;
  account_type?: AccountType;
  amount: number;
  type: 'debit' | 'credit';
  description?: string;
}

interface JournalEntry {
  date: Date;
  description: string;
  reference?: string;
  lines: JournalLine[];
  organization_id: string;
  user_id: string;
}

export class AccountingEngine {
  /**
   * Smartly process a journal entry
   * - Auto-creates accounts if they don't exist
   * - Validates debits = credits
   * - Prevents duplicates
   */
  static async processJournalEntry(data: JournalEntry) {
    const { date, description, reference, lines, organization_id, user_id } = data;

    // Validate: Debits must equal Credits
    const totalDebits = lines.filter(l => l.type === 'debit').reduce((sum, l) => sum + l.amount, 0);
    const totalCredits = lines.filter(l => l.type === 'credit').reduce((sum, l) => sum + l.amount, 0);

    if (Math.abs(totalDebits - totalCredits) > 0.01) {
      throw new Error(
        `Journal entry is not balanced. Debits: ₦${totalDebits.toFixed(2)}, Credits: ₦${totalCredits.toFixed(2)}`
      );
    }

    return await withTransaction(async (client) => {
      // Process each line - get or create account
      const processedLines: { account_id: string; amount: number; type: string; description?: string }[] = [];

      for (const line of lines) {
        // Get or create account
        let account = await this.getOrCreateAccount(
          line.account_name,
          line.account_type || this.inferAccountType(line.account_name),
          organization_id,
          client
        );

        processedLines.push({
          account_id: account.id,
          amount: line.amount,
          type: line.type,
          description: line.description
        });
      }

      // Create manual journal entry
      const entryId = uuidv4();
      const entryNumber = `JE-${Date.now()}`;

      await client.query(
        `INSERT INTO manual_journal_entries (
          id, entry_number, date, description, reference, status, created_by, organization_id
        ) VALUES ($1, $2, $3, $4, $5, 'posted', $6, $7)`,
        [entryId, entryNumber, date, description, reference || null, user_id, organization_id]
      );

      // Insert lines and update balances
      for (const line of processedLines) {
        const lineId = uuidv4();

        await client.query(
          `INSERT INTO manual_journal_entry_lines (
            id, entry_id, account_id, amount, type, organization_id
          ) VALUES ($1, $2, $3, $4, $5, $6)`,
          [lineId, entryId, line.account_id, line.amount, line.type, organization_id]
        );

        // Update account balance
        const account = await client.query(
          'SELECT balance, normal_balance FROM accounts WHERE id = $1',
          [line.account_id]
        );

        const currentBalance = parseFloat(account.rows[0].balance);
        const isDebit = line.type === 'debit';
        const normalBalanceDebit = account.rows[0].normal_balance === 'debit';

        let newBalance: number;
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

      // Create transaction record
      const transactionId = uuidv4();
      await client.query(
        `INSERT INTO transactions (
          id, date, description, reference_number, type, source_type, source_id, status, organization_id
        ) VALUES ($1, $2, $3, $4, 'journal', 'manual', $5, 'posted', $6)`,
        [transactionId, date, description, reference || null, entryId, organization_id]
      );

      // Create journal entries for reporting
      for (const line of processedLines) {
        const jeId = uuidv4();
        await client.query(
          `INSERT INTO journal_entries (
            id, transaction_id, account_id, amount, type, organization_id
          ) VALUES ($1, $2, $3, $4, $5, $6)`,
          [jeId, transactionId, line.account_id, line.amount, line.type, organization_id]
        );
      }

      return { entryId, entryNumber, transactionId };
    });
  }

  /**
   * Get or create an account - prevents duplication
   */
  private static async getOrCreateAccount(
    name: string,
    type: AccountType,
    organization_id: string,
    client: any
  ): Promise<Account> {
    // Check if account exists (case-insensitive)
    const existing = await client.query(
      'SELECT id, code, name, type, normal_balance FROM accounts WHERE LOWER(name) = LOWER($1) AND organization_id = $2 AND is_active = true',
      [name, organization_id]
    );

    if (existing.rows.length > 0) {
      return {
        id: existing.rows[0].id,
        code: existing.rows[0].code,
        name: existing.rows[0].name,
        type: existing.rows[0].type as AccountType,
        normal_balance: existing.rows[0].normal_balance
      };
    }

    // Create new account
    const normalBalance = ['Asset', 'Expense'].includes(type) ? 'debit' : 'credit';
    const prefix = this.getCodePrefix(type);
    const code = prefix + await this.getNextCodeNumber(prefix, organization_id, client);

    const id = uuidv4();
    await client.query(
      `INSERT INTO accounts (id, code, name, type, normal_balance, organization_id, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, true)`,
      [id, code, name, type, normalBalance, organization_id]
    );

    return {
      id,
      code,
      name,
      type,
      normal_balance: normalBalance
    };
  }

  /**
   * Get code prefix based on account type
   */
  private static getCodePrefix(type: AccountType): string {
    const map: Record<AccountType, string> = {
      'Asset': '1',
      'Liability': '2',
      'Equity': '3',
      'Revenue': '4',
      'Expense': '5'
    };
    return map[type] || '9';
  }

  /**
   * Get next sequential number for account code
   */
  private static async getNextCodeNumber(
    prefix: string,
    organization_id: string,
    client: any
  ): Promise<string> {
    const result = await client.query(
      'SELECT MAX(CAST(SUBSTRING(code, 2) AS INTEGER)) as max_num FROM accounts WHERE code LIKE $1 AND organization_id = $2',
      [prefix + '%', organization_id]
    );
    const nextNum = (parseInt(result.rows[0]?.max_num || '0') + 1);
    return String(nextNum).padStart(3, '0');
  }

  /**
   * Infer account type from name
   */
  private static inferAccountType(name: string): AccountType {
    const lower = name.toLowerCase();
    if (lower.includes('expense') || lower.includes('cost') || lower.includes('salary') || 
        lower.includes('rent') || lower.includes('utility') || lower.includes('supplies') ||
        lower.includes('marketing') || lower.includes('insurance') || lower.includes('depreciation') ||
        lower.includes('office') || lower.includes('maintenance') || lower.includes('legal') ||
        lower.includes('training') || lower.includes('software') || lower.includes('internet') ||
        lower.includes('telephone') || lower.includes('professional') || lower.includes('development')) {
      return 'Expense';
    }
    if (lower.includes('revenue') || lower.includes('income') || lower.includes('sales') || lower.includes('service') ||
        lower.includes('consulting') || lower.includes('interest') || lower.includes('fees')) {
      return 'Revenue';
    }
    if (lower.includes('payable') || lower.includes('loan') || lower.includes('debt') || lower.includes('accrued') ||
        lower.includes('tax') || lower.includes('pension') || lower.includes('paye') || lower.includes('vat')) {
      return 'Liability';
    }
    if (lower.includes('equity') || lower.includes('capital') || lower.includes('owner') || lower.includes('retained') ||
        lower.includes('earnings') || lower.includes('draw') || lower.includes('contribution')) {
      return 'Equity';
    }
    return 'Asset';
  }
}