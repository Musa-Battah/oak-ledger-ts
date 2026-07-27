import { NextRequest, NextResponse } from 'next/server';
import { parseExcelFile, parseCSVFile, importCustomers, importProducts } from '@/lib/import-export';
import { getCurrentUser } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const type = formData.get('type') as string;
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }
    
    const buffer = Buffer.from(await file.arrayBuffer());
    const extension = file.name.split('.').pop()?.toLowerCase();
    
    let data: any[];
    if (extension === 'xlsx' || extension === 'xls') {
      data = parseExcelFile(buffer);
    } else if (extension === 'csv') {
      data = parseCSVFile(buffer.toString());
    } else {
      return NextResponse.json({ error: 'Unsupported file format. Use .csv, .xlsx, or .xls' }, { status: 400 });
    }
    
    let result;
    if (type === 'customers') {
      result = await importCustomers(data);
    } else if (type === 'products') {
      result = await importProducts(data);
    } else {
      return NextResponse.json({ error: 'Invalid import type' }, { status: 400 });
    }
    
    return NextResponse.json({
      success: result.success,
      imported: result.imported,
      skipped: result.skipped,
      errors: result.errors,
      message: `Imported ${result.imported} records, skipped ${result.skipped}`
    });
  } catch (error) {
    console.error('Import error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Import failed'
    }, { status: 500 });
  }
}