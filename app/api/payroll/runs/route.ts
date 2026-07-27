import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { PayrollRun, ApiResponse } from '@/types';
import { getCurrentOrganizationId, getCurrentUser } from '@/lib/auth';
import { v4 as uuidv4 } from 'uuid';

// Calculate tax based on Nigerian PAYE rates
async function calculateTax(annualIncome: number, orgId: string): Promise<number> {
  const rates = await query(`
    SELECT annual_income_min, annual_income_max, tax_rate
    FROM payroll_tax_rates
    WHERE organization_id = $1 AND is_active = true
    ORDER BY annual_income_min
  `, [orgId]);

  let tax = 0;
  for (const rate of rates.rows) {
    if (annualIncome > rate.annual_income_min) {
      const taxable = Math.min(annualIncome, rate.annual_income_max) - rate.annual_income_min;
      tax += taxable * (rate.tax_rate / 100);
    }
  }
  return tax;
}

export async function GET(request: NextRequest): Promise<NextResponse<ApiResponse<PayrollRun[]>>> {
  try {
    const orgId = await getCurrentOrganizationId();
    if (!orgId) {
      return NextResponse.json({ success: false, error: 'Organization not found' }, { status: 401 });
    }

    const result = await query(`
      SELECT pr.*, u.name as created_by_name
      FROM payroll_runs pr
      LEFT JOIN users u ON pr.created_by = u.id
      WHERE pr.organization_id = $1
      ORDER BY pr.created_at DESC
    `, [orgId]);

    return NextResponse.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching payroll runs:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse>> {
  try {
    const orgId = await getCurrentOrganizationId();
    const user = await getCurrentUser();
    if (!orgId || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { period_start, period_end, run_date, notes } = await request.json();

    // Get active employees
    const employees = await query(`
      SELECT * FROM employees 
      WHERE organization_id = $1 AND is_active = true
    `, [orgId]);

    if (employees.rows.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No active employees found'
      }, { status: 400 });
    }

    // Generate run number
    const runNumber = `PR-${Date.now()}`;
    const runId = uuidv4();

    let totalGross = 0;
    let totalDeductions = 0;
    let totalNet = 0;

    // Create payroll run
    await query(
      `INSERT INTO payroll_runs (
        id, organization_id, run_number, period_start, period_end, run_date,
        status, created_by, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, 'draft', $7, $8)`,
      [runId, orgId, runNumber, period_start, period_end, run_date, user.id, notes || null]
    );

    // Create payroll entries for each employee
    for (const employee of employees.rows) {
      // Calculate gross pay
      const grossPay = employee.basic_salary +
        employee.housing_allowance +
        employee.transport_allowance +
        employee.medical_allowance +
        employee.other_allowances;

      // Calculate annual income (monthly * 12)
      const annualIncome = grossPay * 12;

      // Calculate tax (PAYE)
      const taxDeduction = await calculateTax(annualIncome, orgId) / 12;

      // Calculate pension (7.5% of basic salary)
      const pensionRate = employee.pension_percentage || 7.5;
      const pensionDeduction = employee.basic_salary * (pensionRate / 100);

      // Calculate NHF (2.5% of basic salary)
      const nhfDeduction = employee.basic_salary * 0.025;

      // Calculate total deductions
      const totalDeductions = taxDeduction + pensionDeduction + nhfDeduction;
      const netPay = grossPay - totalDeductions;

      totalGross += grossPay;
      totalDeductions += totalDeductions;
      totalNet += netPay;

      // Insert payroll entry
      await query(
        `INSERT INTO payroll_entries (
          id, payroll_run_id, employee_id, organization_id,
          gross_pay, tax_deduction, pension_deduction, nhf_deduction,
          total_deductions, net_pay, payment_status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'pending')`,
        [
          uuidv4(), runId, employee.id, orgId,
          grossPay, taxDeduction, pensionDeduction, nhfDeduction,
          totalDeductions, netPay
        ]
      );
    }

    // Update payroll run totals
    await query(
      `UPDATE payroll_runs 
       SET total_gross_pay = $1, total_deductions = $2, total_net_pay = $3
       WHERE id = $4`,
      [totalGross, totalDeductions, totalNet, runId]
    );

    return NextResponse.json({
      success: true,
      data: { runId, runNumber },
      message: `Payroll run created for ${employees.rows.length} employees`
    });
  } catch (error) {
    console.error('Error creating payroll run:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}