import { NextRequest, NextResponse } from 'next/server';
import { renderToBuffer } from '@react-pdf/renderer';
import ReportPDF from '@/components/ReportPDF';
import { getBalanceSheetReport } from '@/lib/data/reports';

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const data = await getBalanceSheetReport();
    const asAt = new Date().toLocaleDateString('en-NG');
    
    const pdfStream = await renderToBuffer(
      ReportPDF({ type: 'balance-sheet', data, asAt })
    );
    
    return new NextResponse(pdfStream, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="balance-sheet.pdf"`,
      },
    });
  } catch (error) {
    console.error('Error generating PDF:', error);
    return NextResponse.json(
      { error: 'Failed to generate PDF' },
      { status: 500 }
    );
  }
}