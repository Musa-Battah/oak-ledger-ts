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
  customer_name?: string;
  customer?: Customer;
  date: Date;
  due_date: Date;
  subtotal: number;
  tax: number;
  total: number;
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
  supplier_name?: string;
  supplier?: Supplier;
  date: Date;
  due_date: Date;
  subtotal: number;
  tax: number;
  total: number;
  status: BillStatus;
  notes?: string;
  items?: BillItem[];
  created_at: Date;
  updated_at: Date;
}

// ============================================
// TRANSACTION & JOURNAL TYPES
// ============================================

export type TransactionType = 'invoice' | 'bill' | 'expense' | 'transfer' | 'journal';
export type TransactionStatus = 'draft' | 'posted' | 'void';
export type JournalEntryType = 'debit' | 'credit';

export interface JournalEntry {
  id: string;
  transaction_id: string;
  account_id: string;
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
  type: TransactionType;
  status: TransactionStatus;
  entries?: JournalEntry[];
  created_at: Date;
  updated_at: Date;
}

// ============================================
// FORM TYPES
// ============================================

export interface InvoiceFormData {
  customer_id: string;
  date: string;
  due_date: string;
  notes: string;
  items: InvoiceFormItem[];
}

export interface InvoiceFormItem {
  description: string;
  quantity: number;
  unit_price: number;
  amount: number;
}

export interface BillFormData {
  supplier_id: string;
  date: string;
  due_date: string;
  notes: string;
  items: BillFormItem[];
}

export interface BillFormItem {
  description: string;
  quantity: number;
  unit_price: number;
  amount: number;
}

// ============================================
// DASHBOARD & REPORT TYPES
// ============================================

export interface DashboardStats {
  totalRevenue: number;
  outstandingInvoices: number;
  paidInvoices: number;
  totalCustomers: number;
  totalExpenses: number;
  outstandingBills: number;
  totalSuppliers: number;
}

export interface BalanceSheet {
  assets: {
    total: number;
    items: Account[];
  };
  liabilities: {
    total: number;
    items: Account[];
  };
  equity: {
    total: number;
    items: Account[];
  };
}

export interface ProfitLoss {
  revenue: {
    total: number;
    items: Account[];
  };
  expenses: {
    total: number;
    items: Account[];
  };
  netIncome: number;
}

// ============================================
// REPORT TYPES
// ============================================

// Add to existing ProfitLossReport interface
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
  period?: 'today' | 'week' | 'month' | 'quarter' | 'year' | 'custom';
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