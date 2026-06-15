import * as XLSX from 'xlsx';

export interface ExportColumn {
  header: string;
  key: string;
  format?: (value: any) => string;
}

export function exportToExcel<T>(
  data: T[],
  columns: ExportColumn[],
  filename: string,
  sheetName: string = 'Sheet1'
): void {
  // Transform data to match column headers
  const worksheetData = data.map(row => {
    const newRow: Record<string, any> = {};
    columns.forEach(col => {
      let value = (row as any)[col.key];
      if (col.format && value !== undefined && value !== null) {
        value = col.format(value);
      } else if (value === undefined || value === null) {
        value = '';
      }
      newRow[col.header] = value;
    });
    return newRow;
  });

  // Create worksheet
  const worksheet = XLSX.utils.json_to_sheet(worksheetData);
  
  // Auto-size columns
  const maxWidths: number[] = [];
  columns.forEach((col, idx) => {
    const headerLength = col.header.length;
    let maxDataLength = headerLength;
    
    worksheetData.forEach(row => {
      const value = row[col.header];
      if (value) {
        const valueLength = String(value).length;
        if (valueLength > maxDataLength) {
          maxDataLength = Math.min(valueLength, 50); // Cap at 50 characters
        }
      }
    });
    maxWidths[idx] = maxDataLength + 2;
  });
  
  worksheet['!cols'] = maxWidths.map(width => ({ wch: width }));

  // Create workbook
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  
  // Export file
  XLSX.writeFile(workbook, `${filename}.xlsx`);
}

export function formatNairaForExcel(value: number): string {
  if (!value && value !== 0) return '';
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 2,
  }).format(value);
}

export function formatDateForExcel(value: Date | string): string {
  if (!value) return '';
  const date = typeof value === 'string' ? new Date(value) : value;
  return date.toLocaleDateString('en-NG');
}