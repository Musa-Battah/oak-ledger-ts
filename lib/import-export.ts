import * as XLSX from 'xlsx';
import { query } from './db';
import { v4 as uuidv4 } from 'uuid';
import { getCurrentOrganizationId } from './auth';

// ============================================
// CSV/EXCEL IMPORT
// ============================================

export interface ImportResult {
  success: boolean;
  imported: number;
  skipped: number;
  errors: string[];
  data: any[];
}

export async function importCustomers(data: any[]): Promise<ImportResult> {
  const orgId = await getCurrentOrganizationId();
  if (!orgId) {
    return { success: false, imported: 0, skipped: 0, errors: ['Organization not found'], data: [] };
  }
  
  const errors: string[] = [];
  let imported = 0;
  let skipped = 0;
  
  for (const row of data) {
    try {
      // Validate required fields
      if (!row.Name || !row.Email) {
        errors.push(`Row ${data.indexOf(row) + 1}: Name and Email are required`);
        skipped++;
        continue;
      }
      
      // Check for duplicate email
      const existing = await query(
        'SELECT id FROM customers WHERE email = $1 AND organization_id = $2',
        [row.Email, orgId]
      );
      
      if (existing.rows.length > 0) {
        // Update existing
        await query(
          `UPDATE customers 
           SET name = $1, phone = $2, address = $3, updated_at = CURRENT_TIMESTAMP
           WHERE email = $4 AND organization_id = $5`,
          [row.Name, row.Phone || null, row.Address || null, row.Email, orgId]
        );
        imported++;
      } else {
        // Insert new
        await query(
          `INSERT INTO customers (id, name, email, phone, address, organization_id, balance)
           VALUES ($1, $2, $3, $4, $5, $6, 0)`,
          [uuidv4(), row.Name, row.Email, row.Phone || null, row.Address || null, orgId]
        );
        imported++;
      }
    } catch (error) {
      errors.push(`Row ${data.indexOf(row) + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      skipped++;
    }
  }
  
  return { success: errors.length === 0, imported, skipped, errors, data };
}

export async function importProducts(data: any[]): Promise<ImportResult> {
  const orgId = await getCurrentOrganizationId();
  if (!orgId) {
    return { success: false, imported: 0, skipped: 0, errors: ['Organization not found'], data: [] };
  }
  
  const errors: string[] = [];
  let imported = 0;
  let skipped = 0;
  
  for (const row of data) {
    try {
      if (!row.Name) {
        errors.push(`Row ${data.indexOf(row) + 1}: Product Name is required`);
        skipped++;
        continue;
      }
      
      const unitPrice = parseFloat(row['Unit Price']) || 0;
      
      // Check for duplicate SKU
      if (row.SKU) {
        const existing = await query(
          'SELECT id FROM products WHERE sku = $1 AND organization_id = $2',
          [row.SKU, orgId]
        );
        
        if (existing.rows.length > 0) {
          await query(
            `UPDATE products 
             SET name = $1, description = $2, unit_price = $3, cost = $4, updated_at = CURRENT_TIMESTAMP
             WHERE sku = $5 AND organization_id = $6`,
            [row.Name, row.Description || null, unitPrice, parseFloat(row.Cost) || 0, row.SKU, orgId]
          );
          imported++;
          continue;
        }
      }
      
      await query(
        `INSERT INTO products (id, name, description, sku, unit_price, cost, organization_id, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, $7, true)`,
        [uuidv4(), row.Name, row.Description || null, row.SKU || null, unitPrice, parseFloat(row.Cost) || 0, orgId]
      );
      imported++;
    } catch (error) {
      errors.push(`Row ${data.indexOf(row) + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      skipped++;
    }
  }
  
  return { success: errors.length === 0, imported, skipped, errors, data };
}

// ============================================
// CSV/EXCEL EXPORT
// ============================================

export function parseExcelFile(buffer: Buffer): any[] {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  return XLSX.utils.sheet_to_json(sheet);
}

export function parseCSVFile(text: string): any[] {
  const workbook = XLSX.read(text, { type: 'string' });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  return XLSX.utils.sheet_to_json(sheet);
}

export function exportToExcel(data: any[], headers: string[], filename: string): Buffer {
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
}

// ============================================
// TEMPLATES
// ============================================

export function getCustomerTemplate(): any[] {
  return [
    { Name: 'John Doe', Email: 'john@example.com', Phone: '08031234567', Address: 'Lagos, Nigeria' }
  ];
}

export function getProductTemplate(): any[] {
  return [
    { Name: 'Product Name', SKU: 'PROD-001', 'Unit Price': 50000, Cost: 30000, Description: 'Product description' }
  ];
}