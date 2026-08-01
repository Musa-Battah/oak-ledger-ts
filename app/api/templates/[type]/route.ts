import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ type: string }> }
) {
  const { type } = await params;
  
  const templates: Record<string, string> = {
    customers: `Name,Email,Phone,Address\nJohn Doe,john@example.com,08031234567,Lagos, Nigeria`,
    products: `Name,SKU,Unit Price,Cost,Description\nProduct Name,PROD-001,50000,30000,Product description`,
    employees: `First Name,Last Name,Email,Department,Position,Basic Salary,Housing Allowance,Transport Allowance,Medical Allowance\nJohn,Doe,john@work.com,Sales,Manager,350000,100000,50000,40000`,
  };
  
  const content = templates[type];
  if (!content) {
    return NextResponse.json({ error: 'Template not found' }, { status: 404 });
  }
  
  return new NextResponse(content, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="${type}_template.csv"`,
    },
  });
}