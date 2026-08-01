import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const content = `Date,Description,Reference,Account Code,Debit,Credit
2024-01-31,Depreciation expense,DEP-001,5080,5000,
2024-01-31,Depreciation expense,DEP-001,1120,,5000
2024-01-31,Salary expense for January,PAY-001,5300,500000,
2024-01-31,Salary expense for January,PAY-001,1010,,425000
2024-01-31,Salary expense for January,PAY-001,2020,,50000
2024-02-01,Prepaid office rent,RENT-001,1300,100000,
2024-02-01,Prepaid office rent,RENT-001,1010,,100000

# ============================================
# INSTRUCTIONS FOR USING THIS TEMPLATE
# ============================================
# 
# 1. Date - Enter date in YYYY-MM-DD format
# 2. Description - Brief description of the transaction
# 3. Reference - Optional reference number (e.g., DEP-001, ADJ-001)
# 4. Account Code - The code from your Chart of Accounts
# 5. Debit - Enter debit amount (positive number)
# 6. Credit - Enter credit amount (positive number)
# 
# RULES:
# - Each row must have either a Debit OR Credit (not both)
# - Total Debits must equal Total Credits for each journal entry
# - Account Code must exist in your Chart of Accounts
# - All amounts must be positive numbers
# 
# TIPS:
# - Group rows by journal entry (same Description = same entry)
# - Use the Reference column to group entries if needed
# - Review your Chart of Accounts for correct account codes
# 
# SAMPLE ENTRIES ABOVE SHOW:
# - Depreciation entry (2 lines: Debit + Credit)
# - Salary entry (4 lines: Debit + multiple Credits)
# - Prepaid rent entry (2 lines: Debit + Credit)
# ============================================`;

  return new NextResponse(content, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': 'attachment; filename="journal_template.csv"',
    },
  });
}