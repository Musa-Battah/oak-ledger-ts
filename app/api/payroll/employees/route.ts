import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { Employee, ApiResponse } from '@/types';
import { getCurrentOrganizationId } from '@/lib/auth';
import { v4 as uuidv4 } from 'uuid';

export async function GET(request: NextRequest): Promise<NextResponse<ApiResponse<Employee[]>>> {
  try {
    const orgId = await getCurrentOrganizationId();
    if (!orgId) {
      return NextResponse.json({ success: false, error: 'Organization not found' }, { status: 401 });
    }

    const result = await query<Employee>(`
      SELECT * FROM employees 
      WHERE organization_id = $1 
      ORDER BY last_name, first_name
    `, [orgId]);

    return NextResponse.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching employees:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse<Employee>>> {
  try {
    const orgId = await getCurrentOrganizationId();
    if (!orgId) {
      return NextResponse.json({ success: false, error: 'Organization not found' }, { status: 401 });
    }

    const body = await request.json();
    const {
      first_name, last_name, email, phone, address, date_of_birth,
      hire_date, department, position, bank_name, bank_account_number,
      bank_account_name, bank_sort_code, basic_salary, housing_allowance,
      transport_allowance, medical_allowance, other_allowances
    } = body;

    // Generate employee code
    const codeResult = await query(
      "SELECT COUNT(*) as count FROM employees WHERE organization_id = $1",
      [orgId]
    );
    const count = parseInt(codeResult.rows[0].count) + 1;
    const employee_code = `EMP-${String(count).padStart(4, '0')}`;

    const id = uuidv4();
    await query(
      `INSERT INTO employees (
        id, employee_code, organization_id, first_name, last_name, email, phone, address,
        date_of_birth, hire_date, department, position, bank_name, bank_account_number,
        bank_account_name, bank_sort_code, basic_salary, housing_allowance,
        transport_allowance, medical_allowance, other_allowances, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, true)`,
      [
        id, employee_code, orgId, first_name, last_name, email || null, phone || null,
        address || null, date_of_birth || null, hire_date, department || null,
        position || null, bank_name || null, bank_account_number || null,
        bank_account_name || null, bank_sort_code || null, basic_salary,
        housing_allowance || 0, transport_allowance || 0,
        medical_allowance || 0, other_allowances || 0
      ]
    );

    const result = await query('SELECT * FROM employees WHERE id = $1', [id]);

    return NextResponse.json({
      success: true,
      data: result.rows[0],
      message: 'Employee created successfully'
    });
  } catch (error) {
    console.error('Error creating employee:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}