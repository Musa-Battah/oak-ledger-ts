import { query } from './db';

export async function initializeDatabase(): Promise<void> {
  console.log('📝 Initializing database schema...');
  
  // Enable UUID extension
  await query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
  
  // Create accounts table
  await query(`
    CREATE TABLE IF NOT EXISTS accounts (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      code VARCHAR(20) UNIQUE NOT NULL,
      name VARCHAR(100) NOT NULL,
      type VARCHAR(50) NOT NULL CHECK (type IN ('Asset', 'Liability', 'Equity', 'Revenue', 'Expense')),
      normal_balance VARCHAR(10) NOT NULL CHECK (normal_balance IN ('debit', 'credit')),
      balance DECIMAL(15,2) DEFAULT 0,
      parent_account_id UUID REFERENCES accounts(id),
      is_active BOOLEAN DEFAULT true,
      description TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  // Create customers table
  await query(`
    CREATE TABLE IF NOT EXISTS customers (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      name VARCHAR(100) NOT NULL,
      email VARCHAR(100),
      phone VARCHAR(20),
      address TEXT,
      balance DECIMAL(15,2) DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  // Create suppliers table
  await query(`
    CREATE TABLE IF NOT EXISTS suppliers (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      name VARCHAR(100) NOT NULL,
      email VARCHAR(100),
      phone VARCHAR(20),
      address TEXT,
      balance DECIMAL(15,2) DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  // Create invoices table
  await query(`
    CREATE TABLE IF NOT EXISTS invoices (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      invoice_number VARCHAR(50) UNIQUE NOT NULL,
      customer_id UUID REFERENCES customers(id),
      date DATE NOT NULL,
      due_date DATE NOT NULL,
      subtotal DECIMAL(15,2) NOT NULL,
      tax DECIMAL(15,2) DEFAULT 0,
      total DECIMAL(15,2) NOT NULL,
      status VARCHAR(20) DEFAULT 'draft',
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  // Create invoice_items table
  await query(`
    CREATE TABLE IF NOT EXISTS invoice_items (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
      description TEXT NOT NULL,
      quantity DECIMAL(10,2) NOT NULL,
      unit_price DECIMAL(15,2) NOT NULL,
      amount DECIMAL(15,2) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  // Create bills table
  await query(`
    CREATE TABLE IF NOT EXISTS bills (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      bill_number VARCHAR(50) UNIQUE NOT NULL,
      supplier_id UUID REFERENCES suppliers(id),
      date DATE NOT NULL,
      due_date DATE NOT NULL,
      subtotal DECIMAL(15,2) NOT NULL,
      tax DECIMAL(15,2) DEFAULT 0,
      total DECIMAL(15,2) NOT NULL,
      status VARCHAR(20) DEFAULT 'draft',
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  // Create bill_items table
  await query(`
    CREATE TABLE IF NOT EXISTS bill_items (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      bill_id UUID REFERENCES bills(id) ON DELETE CASCADE,
      description TEXT NOT NULL,
      quantity DECIMAL(10,2) NOT NULL,
      unit_price DECIMAL(15,2) NOT NULL,
      amount DECIMAL(15,2) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  // Create products table
  await query(`
    CREATE TABLE IF NOT EXISTS products (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      name VARCHAR(100) NOT NULL,
      description TEXT,
      sku VARCHAR(50) UNIQUE,
      unit_price DECIMAL(15,2) NOT NULL DEFAULT 0,
      cost DECIMAL(15,2),
      current_stock INT DEFAULT 0,
      reorder_level INT DEFAULT 0,
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  // Create transactions table
  await query(`
    CREATE TABLE IF NOT EXISTS transactions (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      date DATE NOT NULL,
      description TEXT,
      reference_number VARCHAR(50),
      type VARCHAR(30),
      status VARCHAR(20) DEFAULT 'posted',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  // Create journal_entries table
  await query(`
    CREATE TABLE IF NOT EXISTS journal_entries (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      transaction_id UUID REFERENCES transactions(id) ON DELETE CASCADE,
      account_id UUID REFERENCES accounts(id),
      amount DECIMAL(15,2) NOT NULL,
      type VARCHAR(10) NOT NULL CHECK (type IN ('debit', 'credit')),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  // Create indexes
  console.log('📝 Creating indexes...');
  await query(`CREATE INDEX IF NOT EXISTS idx_invoices_customer ON invoices(customer_id)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_bills_supplier ON bills(supplier_id)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_bills_status ON bills(status)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_journal_entries_transaction ON journal_entries(transaction_id)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_journal_entries_account ON journal_entries(account_id)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku)`);
  
  // Insert required accounts
  await ensureRequiredAccounts();
  await insertDefaultProducts();
  await insertSampleCustomers();
  
  console.log('✅ Database schema created successfully');
}

async function ensureRequiredAccounts(): Promise<void> {
  console.log('📝 Ensuring required accounts exist...');
  
  const requiredAccounts = [
    ['1010', 'Cash', 'Asset', 'debit'],
    ['1020', 'Bank Account', 'Asset', 'debit'],
    ['1040', 'Accounts Receivable', 'Asset', 'debit'],
    ['2010', 'Accounts Payable', 'Liability', 'credit'],
    ['3010', "Owner's Equity", 'Equity', 'credit'],
    ['4010', 'Sales Revenue', 'Revenue', 'credit'],
    ['5010', 'Operating Expenses', 'Expense', 'debit'],
  ];
  
  for (const account of requiredAccounts) {
    await query(
      `INSERT INTO accounts (code, name, type, normal_balance, is_active)
       VALUES ($1, $2, $3, $4, true)
       ON CONFLICT (code) DO NOTHING`,
      account
    );
  }
  
  // Verify accounts were created
  const result = await query('SELECT COUNT(*) as count FROM accounts');
  console.log(`✅ Accounts verified: ${result.rows[0].count} total accounts`);
}

async function insertDefaultProducts(): Promise<void> {
  const result = await query('SELECT COUNT(*) FROM products');
  if (parseInt(result.rows[0].count) > 0) {
    console.log(`📋 Products already exist (${result.rows[0].count} found)`);
    return;
  }
  
  console.log('📝 Inserting sample products...');
  
  const products = [
    ['Consulting Services', 'SERV-001', 50000],
    ['Website Design', 'WEB-001', 250000],
    ['Software License', 'SOFT-001', 150000],
    ['Office Supplies', 'SUP-001', 25000],
  ];
  
  for (const product of products) {
    await query(
      `INSERT INTO products (name, sku, unit_price, is_active) 
       VALUES ($1, $2, $3, true) 
       ON CONFLICT (sku) DO NOTHING`,
      product
    );
  }
  
  console.log(`✅ Inserted ${products.length} sample products`);
}

async function insertSampleCustomers(): Promise<void> {
  const result = await query('SELECT COUNT(*) FROM customers');
  if (parseInt(result.rows[0].count) > 0) {
    return;
  }
  
  console.log('📝 Inserting sample customers...');
  
  const customers = [
    ['ABC Nigeria Ltd', 'contact@abcng.com', '08031234567', 'Lagos, Nigeria'],
    ['XYZ Enterprises', 'info@xyz.com', '08029876543', 'Abuja, Nigeria'],
    ['Tech Solutions NG', 'hello@techsolutions.ng', '08055551234', 'Port Harcourt, Nigeria'],
  ];
  
  for (const customer of customers) {
    await query(
      `INSERT INTO customers (name, email, phone, address) 
       VALUES ($1, $2, $3, $4)`,
      customer
    );
  }
  
  console.log(`✅ Inserted ${customers.length} sample customers`);
}