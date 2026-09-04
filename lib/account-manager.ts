import { query } from './db';
import { AccountingEngine } from './accounting-engine';

interface AccountTemplate {
  name: string;
  type: 'Asset' | 'Liability' | 'Equity' | 'Revenue' | 'Expense';
  synonyms?: string[];
}

export class AccountManager {
  private static templates: AccountTemplate[] = [
    // Assets
    { name: 'Cash', type: 'Asset', synonyms: ['cash', 'money', 'petty cash'] },
    { name: 'Bank Account', type: 'Asset', synonyms: ['bank', 'checking', 'savings'] },
    { name: 'Accounts Receivable', type: 'Asset', synonyms: ['receivable', 'ar', 'debtors'] },
    { name: 'Inventory', type: 'Asset', synonyms: ['stock', 'goods', 'products'] },
    { name: 'Prepaid Expenses', type: 'Asset', synonyms: ['prepaid', 'advance payment'] },
    { name: 'Fixed Assets', type: 'Asset', synonyms: ['fixed', 'property', 'equipment'] },
    
    // Liabilities
    { name: 'Accounts Payable', type: 'Liability', synonyms: ['payable', 'ap', 'creditors'] },
    { name: 'Accrued Expenses', type: 'Liability', synonyms: ['accrued', 'accrual'] },
    { name: 'Loans Payable', type: 'Liability', synonyms: ['loan', 'debt', 'borrowing'] },
    { name: 'PAYE Payable', type: 'Liability', synonyms: ['paye', 'tax payable'] },
    { name: 'Pension Payable', type: 'Liability', synonyms: ['pension', 'retirement'] },
    
    // Equity
    { name: "Owner's Equity", type: 'Equity', synonyms: ['equity', 'capital', 'owner'] },
    { name: 'Retained Earnings', type: 'Equity', synonyms: ['retained', 'earnings', 'profit'] },
    
    // Revenue
    { name: 'Sales Revenue', type: 'Revenue', synonyms: ['sales', 'revenue', 'income'] },
    { name: 'Service Revenue', type: 'Revenue', synonyms: ['service', 'services', 'fees'] },
    
    // Expenses
    { name: 'Salaries Expense', type: 'Expense', synonyms: ['salaries', 'salary', 'wages'] },
    { name: 'Rent Expense', type: 'Expense', synonyms: ['rent', 'leasing'] },
    { name: 'Utilities Expense', type: 'Expense', synonyms: ['utilities', 'electricity', 'water'] },
    { name: 'Office Supplies', type: 'Expense', synonyms: ['supplies', 'stationery'] },
    { name: 'Marketing Expense', type: 'Expense', synonyms: ['marketing', 'advertising'] },
    { name: 'Depreciation Expense', type: 'Expense', synonyms: ['depreciation', 'amortization'] },
  ];

  /**
   * Find or create an account based on name
   */
  static async findOrCreateAccount(
    name: string,
    organization_id: string
  ): Promise<string> {
    // Check if account exists
    const existing = await query(
      'SELECT id FROM accounts WHERE LOWER(name) = LOWER($1) AND organization_id = $2',
      [name, organization_id]
    );

    if (existing.rows.length > 0) {
      return existing.rows[0].id;
    }

    // Find matching template
    const template = this.findMatchingTemplate(name);
    
    // Create account using AccountingEngine
    // For now, we'll create directly
    const type = template?.type || 'Asset';
    const normalBalance = ['Asset', 'Expense'].includes(type) ? 'debit' : 'credit';
    const prefix = type === 'Asset' ? '1' : type === 'Liability' ? '2' : type === 'Equity' ? '3' : type === 'Revenue' ? '4' : '5';
    
    const numResult = await query(
      'SELECT MAX(CAST(SUBSTRING(code, 2) AS INTEGER)) as max_num FROM accounts WHERE code LIKE $1 AND organization_id = $2',
      [prefix + '%', organization_id]
    );
    const nextNum = (parseInt(numResult.rows[0]?.max_num || '0') + 1);
    const code = prefix + String(nextNum).padStart(3, '0');

    const id = await import('uuid').then(u => u.v4());
    await query(
      `INSERT INTO accounts (id, code, name, type, normal_balance, organization_id, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, true)`,
      [id, code, name, type, normalBalance, organization_id]
    );

    return id;
  }

  /**
   * Find matching template for an account name
   */
  private static findMatchingTemplate(name: string): AccountTemplate | null {
    const lowerName = name.toLowerCase();
    
    // Exact match
    for (const template of this.templates) {
      if (template.name.toLowerCase() === lowerName) {
        return template;
      }
    }
    
    // Synonym match
    for (const template of this.templates) {
      if (template.synonyms?.some(s => lowerName.includes(s) || s.includes(lowerName))) {
        return template;
      }
    }
    
    // Partial match
    for (const template of this.templates) {
      if (lowerName.includes(template.name.toLowerCase()) || 
          template.name.toLowerCase().includes(lowerName)) {
        return template;
      }
    }
    
    return null;
  }
}