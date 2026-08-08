// ============================================
// CORE TYPES
// ============================================

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// ============================================
// ACCOUNT TYPES
// ============================================

export type AccountType = 'Asset' | 'Liability' | 'Equity' | 'Revenue' | 'Expense';
export type NormalBalance = 'debit' | 'credit';

export interface Account {
  id: string;
  code: string;
  name: string;
  type: AccountType;
  normal_balance: NormalBalance;
  balance: number;
  parent_account_id?: string;
  parent_name?: string;
  parent_code?: string;
  is_active: boolean;
  description?: string;
  child_count?: number;
  children?: Account[];
  organization_id: string;
  created_at: Date;
  updated_at: Date;
}

// ============================================
// CUSTOMER & SUPPLIER TYPES
// ============================================

export interface Customer {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  organization_id: string;
  balance: number;
  invoice_count?: number;
  total_paid?: number;
  outstanding?: number;
  created_at: Date;
  updated_at: Date;
}

export interface Supplier {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  organization_id: string;
  balance: number;
  bill_count?: number;
  total_paid?: number;
  outstanding?: number;
  created_at: Date;
  updated_at: Date;
}

// ============================================
// PRODUCT TYPES
// ============================================

export interface Product {
  id: string;
  name: string;
  description?: string;
  sku?: string;
  organization_id: string;
  unit_price: number;
  cost?: number;
  current_stock: number;
  reorder_level: number;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

// ============================================
// INVOICE TYPES
// ============================================

export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';

export interface InvoiceItem {
  id: string;
  invoice_id: string;
  description: string;
  quantity: number;
  unit_price: number;
  amount: number;
}

export interface Invoice {
  id: string;
  invoice_number: string;
  customer_id: string;
  organization_id: string;
  customer_name?: string;
  customer?: Customer;
  date: Date;
  due_date: Date;
  subtotal: number;
  tax: number;
  total: number;
  amount_paid: number;
  balance_due: number;
  status: InvoiceStatus;
  notes?: string;
  items?: InvoiceItem[];
  created_at: Date;
  updated_at: Date;
}

// ============================================
// BILL TYPES
// ============================================

export type BillStatus = 'draft' | 'received' | 'paid' | 'overdue' | 'cancelled';

export interface BillItem {
  id: string;
  bill_id: string;
  description: string;
  quantity: number;
  unit_price: number;
  amount: number;
}

export interface Bill {
  id: string;
  bill_number: string;
  supplier_id: string;
  organization_id: string;
  supplier_name?: string;
  supplier?: Supplier;
  date: Date;
  due_date: Date;
  subtotal: number;
  tax: number;
  total: number;
  amount_paid: number;
  balance_due: number;
  status: BillStatus;
  notes?: string;
  items?: BillItem[];
  created_at: Date;
  updated_at: Date;
}

// ============================================
// TRANSACTION & JOURNAL TYPES
// ============================================

export type TransactionType = 'invoice' | 'bill' | 'expense' | 'transfer' | 'journal' | 'payment';
export type TransactionStatus = 'draft' | 'posted' | 'void';
export type JournalEntryType = 'debit' | 'credit';

export interface JournalEntry {
  id: string;
  transaction_id: string;
  account_id: string;
  organization_id: string;
  account_name?: string;
  account_code?: string;
  amount: number;
  type: JournalEntryType;
  created_at: Date;
}

export interface Transaction {
  id: string;
  date: Date;
  description: string;
  reference_number?: string;
  organization_id: string;
  type: TransactionType;
  status: TransactionStatus;
  source_type?: string;
  source_id?: string;
  entries?: JournalEntry[];
  created_at: Date;
  updated_at: Date;
}

// ============================================
// MANUAL JOURNAL ENTRY TYPES
// ============================================

export type JournalEntryStatus = 'draft' | 'posted' | 'void';

export interface ManualJournalEntryLine {
  id?: string;
  account_id: string;
  account_name?: string;
  account_code?: string;
  amount: number;
  type: 'debit' | 'credit';
  description?: string;
}

export interface ManualJournalEntry {
  id: string;
  entry_number: string;
  date: Date;
  description: string;
  reference?: string;
  status: JournalEntryStatus;
  created_by?: string;
  created_by_name?: string;
  lines: ManualJournalEntryLine[];
  total_debits: number;
  total_credits: number;
  is_balanced: boolean;
  created_at: Date;
  updated_at: Date;
  posted_at?: Date;
  void_reason?: string;
}

// ============================================
// DASHBOARD STATS TYPES
// ============================================

export interface DashboardStats {
  totalRevenue: number;
  outstandingInvoices: number;
  paidInvoices: number;
  totalCustomers: number;
  totalExpenses: number;
  outstandingBills: number;
  totalSuppliers: number;
  totalEmployees?: number;
  recentPayrollAmount?: number;
}

// ============================================
// REPORT TYPES
// ============================================

export interface ProfitLossReport {
  revenue: {
    total: number;
    items: Array<{
      account_id: string;
      account_name: string;
      amount: number;
      transaction_count?: number;
    }>;
  };
  cogs?: {
    total: number;
    items: Array<{
      account_id: string;
      account_name: string;
      amount: number;
    }>;
  };
  expenses: {
    total: number;
    items: Array<{
      account_id: string;
      account_name: string;
      amount: number;
      transaction_count?: number;
    }>;
  };
  grossProfit?: number;
  netIncome: number;
}

export interface BalanceSheetReport {
  assets: {
    total: number;
    current: {
      total: number;
      items: Array<{
        account_id: string;
        account_name: string;
        balance: number;
      }>;
    };
    fixed: {
      total: number;
      items: Array<{
        account_id: string;
        account_name: string;
        balance: number;
      }>;
    };
  };
  liabilities: {
    total: number;
    current: {
      total: number;
      items: Array<{
        account_id: string;
        account_name: string;
        balance: number;
      }>;
    };
    longTerm: {
      total: number;
      items: Array<{
        account_id: string;
        account_name: string;
        balance: number;
      }>;
    };
  };
  equity: {
    total: number;
    items: Array<{
      account_id: string;
      account_name: string;
      balance: number;
    }>;
  };
}

export interface TrialBalanceReport {
  accounts: Array<{
    account_id: string;
    account_code: string;
    account_name: string;
    account_type: string;
    debit: number;
    credit: number;
  }>;
  totalDebits: number;
  totalCredits: number;
  isBalanced: boolean;
}

export interface CashFlowReport {
  operating: {
    total: number;
    items: Array<{
      description: string;
      amount: number;
      type: 'inflow' | 'outflow';
    }>;
  };
  investing: {
    total: number;
    items: Array<{
      description: string;
      amount: number;
      type: 'inflow' | 'outflow';
    }>;
  };
  financing: {
    total: number;
    items: Array<{
      description: string;
      amount: number;
      type: 'inflow' | 'outflow';
    }>;
  };
  netCashFlow: number;
  beginningCash: number;
  endingCash: number;
}

export interface ReportFilter {
  startDate?: string;
  endDate?: string;
  period?: 'today' | 'week' | 'month' | 'quarter' | 'year' | 'custom' | 'all';
  accountType?: string;
}

// ============================================
// PAYMENT TYPES
// ============================================

export type PaymentMethod = 'cash' | 'bank_transfer' | 'cheque' | 'card' | 'other';
export type PaymentStatus = 'pending' | 'completed' | 'failed' | 'refunded';

export interface Payment {
  id: string;
  payment_number: string;
  invoice_id?: string;
  bill_id?: string;
  customer_id?: string;
  supplier_id?: string;
  payment_date: Date;
  amount: number;
  payment_method: PaymentMethod;
  reference_number?: string;
  notes?: string;
  status: PaymentStatus;
  created_at: Date;
  updated_at: Date;
}

export interface PaymentFormData {
  payment_date: string;
  amount: number;
  payment_method: PaymentMethod;
  reference_number?: string;
  notes?: string;
}

// ============================================
// AUTHENTICATION TYPES
// ============================================

export type UserRole = 'admin' | 'accountant' | 'viewer';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  organization_id: string;
  is_active: boolean;
  last_login?: Date;
  created_at: Date;
  updated_at: Date;
}

export interface Organization {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  tax_id?: string;
  logo_url?: string;
  created_at: Date;
  updated_at: Date;
}

export interface Session {
  id: string;
  user_id: string;
  token: string;
  expires_at: Date;
  ip_address?: string;
  user_agent?: string;
  created_at: Date;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  name: string;
  email: string;
  password: string;
  organization_name: string;
}

export interface AuthResponse {
  success: boolean;
  user?: User;
  token?: string;
  error?: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

// ============================================
// PAYROLL TYPES
// ============================================

export interface Employee {
  id: string;
  employee_code: string;
  organization_id: string;
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  address?: string;
  date_of_birth?: Date;
  hire_date: Date;
  termination_date?: Date;
  department?: string;
  position?: string;
  bank_name?: string;
  bank_account_number?: string;
  bank_account_name?: string;
  bank_sort_code?: string;
  basic_salary: number;
  housing_allowance: number;
  transport_allowance: number;
  medical_allowance: number;
  other_allowances: number;
  pension_percentage: number;
  tax_percentage: number;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface PayrollRun {
  id: string;
  organization_id: string;
  run_number: string;
  period_start: Date;
  period_end: Date;
  run_date: Date;
  status: 'draft' | 'processing' | 'completed' | 'cancelled';
  total_gross_pay: number;
  total_deductions: number;
  total_net_pay: number;
  created_by?: string;
  approved_by?: string;
  notes?: string;
  entries?: PayrollEntry[];
  created_at: Date;
  updated_at: Date;
}

export interface PayrollEntry {
  id: string;
  payroll_run_id: string;
  employee_id: string;
  employee?: Employee;
  organization_id: string;
  gross_pay: number;
  tax_deduction: number;
  pension_deduction: number;
  nhf_deduction: number;
  health_insurance_deduction: number;
  other_deductions: number;
  total_deductions: number;
  net_pay: number;
  payment_status: 'pending' | 'paid' | 'failed';
  payment_date?: Date;
  created_at: Date;
  updated_at: Date;
}

export interface PayrollTaxRate {
  id: string;
  organization_id: string;
  annual_income_min: number;
  annual_income_max: number;
  tax_rate: number;
  effective_year: number;
  is_active: boolean;
}

// ============================================
// JOURNAL ENTRY IMPORT TYPES
// ============================================

export interface JournalEntryImportRow {
  date: string;
  description: string;
  reference?: string;
  account_code: string;
  account_name?: string;
  account_type?: string;
  debit?: number;
  credit?: number;
  errors?: string[];
  isValid?: boolean;
}

export interface JournalEntryImportResult {
  success: boolean;
  imported: number;
  skipped: number;
  errors: string[];
  entries: any[];
  message: string;
}