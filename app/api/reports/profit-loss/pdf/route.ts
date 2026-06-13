import { NextRequest, NextResponse } from 'next/server';
import { renderToBuffer } from '@react-pdf/renderer';
import ReportPDF from '@/components/ReportPDF';
import { getProfitLossReport } from '@/lib/data/reports';

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'month';
    
    const data = await getProfitLossReport(period);
    
    const pdfStream = await renderToBuffer(
      ReportPDF({ type: 'profit-loss', data, period })
    );
    
    return new NextResponse(pdfStream, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="profit-loss-${period}.pdf"`,
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