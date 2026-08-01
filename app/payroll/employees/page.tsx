'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

interface Employee {
  id: string;
  employee_code: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  department: string;
  position: string;
  basic_salary: number;
  housing_allowance: number;
  transport_allowance: number;
  medical_allowance: number;
  other_allowances: number;
  is_active: boolean;
  hire_date: string;
}

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    department: '',
    position: '',
    basic_salary: '',
    housing_allowance: '0',
    transport_allowance: '0',
    medical_allowance: '0',
    other_allowances: '0',
    hire_date: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      const res = await fetch('/api/payroll/employees');
      const data = await res.json();
      if (data.success) {
        setEmployees(data.data || []);
      }
    } catch (error) {
      toast.error('Error fetching employees');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const res = await fetch('/api/payroll/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          basic_salary: parseFloat(formData.basic_salary),
          housing_allowance: parseFloat(formData.housing_allowance),
          transport_allowance: parseFloat(formData.transport_allowance),
          medical_allowance: parseFloat(formData.medical_allowance),
          other_allowances: parseFloat(formData.other_allowances)
        })
      });
      
      const data = await res.json();
      
      if (data.success) {
        toast.success('Employee added successfully');
        setShowForm(false);
        setFormData({
          first_name: '',
          last_name: '',
          email: '',
          phone: '',
          department: '',
          position: '',
          basic_salary: '',
          housing_allowance: '0',
          transport_allowance: '0',
          medical_allowance: '0',
          other_allowances: '0',
          hire_date: new Date().toISOString().split('T')[0]
        });
        fetchEmployees();
      } else {
        toast.error(data.error || 'Failed to add employee');
      }
    } catch (error) {
      toast.error('Error adding employee');
    }
  };

  const getFullName = (employee: Employee) => {
    return `${employee.first_name} ${employee.last_name}`;
  };

  const getTotalAllowances = (employee: Employee) => {
    return employee.housing_allowance + employee.transport_allowance + 
           employee.medical_allowance + employee.other_allowances;
  };

  const getGrossPay = (employee: Employee) => {
    return employee.basic_salary + getTotalAllowances(employee);
  };

  if (loading) {
    return (
      <div className="container">
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <p>Loading employees...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="page-header">
        <div className="page-title">
          <h1>Employees</h1>
          <p>Manage your workforce</p>
        </div>
        <button 
          className="btn-primary"
          onClick={() => setShowForm(!showForm)}
        >
          {showForm ? 'Cancel' : '+ Add Employee'}
        </button>
      </div>

      {showForm && (
        <div className="card">
          <h2>Add New Employee</h2>
          <form onSubmit={handleSubmit}>
            <div className="form-row">
              <div className="form-group">
                <label>First Name *</label>
                <input
                  type="text"
                  value={formData.first_name}
                  onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Last Name *</label>
                <input
                  type="text"
                  value={formData.last_name}
                  onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                  required
                />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Phone</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Department</label>
                <input
                  type="text"
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Position</label>
                <input
                  type="text"
                  value={formData.position}
                  onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Hire Date *</label>
                <input
                  type="date"
                  value={formData.hire_date}
                  onChange={(e) => setFormData({ ...formData, hire_date: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Basic Salary (₦) *</label>
                <input
                  type="number"
                  step="1000"
                  value={formData.basic_salary}
                  onChange={(e) => setFormData({ ...formData, basic_salary: e.target.value })}
                  required
                />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Housing Allowance (₦)</label>
                <input
                  type="number"
                  step="1000"
                  value={formData.housing_allowance}
                  onChange={(e) => setFormData({ ...formData, housing_allowance: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Transport Allowance (₦)</label>
                <input
                  type="number"
                  step="1000"
                  value={formData.transport_allowance}
                  onChange={(e) => setFormData({ ...formData, transport_allowance: e.target.value })}
                />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Medical Allowance (₦)</label>
                <input
                  type="number"
                  step="1000"
                  value={formData.medical_allowance}
                  onChange={(e) => setFormData({ ...formData, medical_allowance: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Other Allowances (₦)</label>
                <input
                  type="number"
                  step="1000"
                  value={formData.other_allowances}
                  onChange={(e) => setFormData({ ...formData, other_allowances: e.target.value })}
                />
              </div>
            </div>
            <div className="form-actions">
              <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>
                Cancel
              </button>
              <button type="submit" className="btn-primary">Save Employee</button>
            </div>
          </form>
        </div>
      )}

      <div className="card">
        {employees.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">👤</div>
            <div className="empty-title">No employees yet</div>
            <div className="empty-description">Add your first employee to start payroll</div>
            <button className="btn-primary" onClick={() => setShowForm(true)}>
              Add Employee
            </button>
          </div>
        ) : (
          <div className="table-container">
            <table className="employees-table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Name</th>
                  <th>Department</th>
                  <th>Position</th>
                  <th>Basic Salary</th>
                  <th>Gross Pay</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {employees.map((employee) => (
                  <tr key={employee.id}>
                    <td>{employee.employee_code}</td>
                    <td>{getFullName(employee)}</td>
                    <td>{employee.department || '-'}</td>
                    <td>{employee.position || '-'}</td>
                    <td>₦{employee.basic_salary.toLocaleString()}</td>
                    <td>₦{getGrossPay(employee).toLocaleString()}</td>
                    <td>
                      <span className={`badge ${employee.is_active ? 'badge-success' : 'badge-danger'}`}>
                        {employee.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>
                      <button className="btn-secondary" style={{ padding: '0.25rem 0.75rem' }}>
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <style jsx>{`
        .empty-state {
          text-align: center;
          padding: 3rem;
        }
        .empty-icon {
          font-size: 3rem;
          margin-bottom: 1rem;
        }
        .empty-title {
          font-size: 1.125rem;
          font-weight: 600;
          margin-bottom: 0.5rem;
        }
        .empty-description {
          color: var(--text-muted);
          margin-bottom: 1.5rem;
        }
        .employees-table {
          width: 100%;
          border-collapse: collapse;
        }
        .employees-table th,
        .employees-table td {
          padding: 0.875rem;
          text-align: left;
          border-bottom: 1px solid var(--border);
        }
        .employees-table th {
          background: var(--bg-tertiary);
          font-weight: 600;
          color: var(--text-muted);
        }
        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
        }
        .form-actions {
          display: flex;
          justify-content: flex-end;
          gap: 1rem;
          margin-top: 1rem;
        }
        .badge-success {
          background: var(--success-dim);
          color: var(--success);
        }
        .badge-danger {
          background: var(--danger-dim);
          color: var(--danger);
        }
        @media (max-width: 768px) {
          .form-row {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}