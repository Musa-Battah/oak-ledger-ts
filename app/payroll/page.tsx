'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

interface PayrollRun {
  id: string;
  run_number: string;
  period_start: string;
  period_end: string;
  run_date: string;
  status: string;
  total_gross_pay: number;
  total_deductions: number;
  total_net_pay: number;
  created_by_name: string;
}

export default function PayrollPage() {
  const [runs, setRuns] = useState<PayrollRun[]>([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showRunForm, setShowRunForm] = useState(false);
  const [formData, setFormData] = useState({
    period_start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    period_end: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0],
    run_date: new Date().toISOString().split('T')[0],
    notes: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [runsRes, employeesRes] = await Promise.all([
        fetch('/api/payroll/runs'),
        fetch('/api/payroll/employees')
      ]);
      
      const runsData = await runsRes.json();
      const employeesData = await employeesRes.json();
      
      if (runsData.success) setRuns(runsData.data || []);
      if (employeesData.success) setEmployees(employeesData.data || []);
    } catch (error) {
      toast.error('Error loading payroll data');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRun = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const res = await fetch('/api/payroll/runs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      
      const data = await res.json();
      
      if (data.success) {
        toast.success(data.message);
        setShowRunForm(false);
        fetchData();
      } else {
        toast.error(data.error || 'Failed to create payroll run');
      }
    } catch (error) {
      toast.error('Error creating payroll run');
    }
  };

  if (loading) {
    return (
      <div className="container">
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <p>Loading payroll...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="page-header">
        <div className="page-title">
          <h1>Payroll</h1>
          <p>Manage employee payroll and runs</p>
        </div>
        <div className="action-buttons">
          <Link href="/payroll/employees">
            <button className="btn-secondary">Manage Employees</button>
          </Link>
          <button className="btn-primary" onClick={() => setShowRunForm(!showRunForm)}>
            {showRunForm ? 'Cancel' : '+ New Payroll Run'}
          </button>
        </div>
      </div>

      {/* Employee Summary */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-title">Total Employees</div>
          <div className="stat-value">{employees.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-title">Total Payroll Runs</div>
          <div className="stat-value">{runs.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-title">Latest Run</div>
          <div className="stat-value">
            {runs.length > 0 ? format(new Date(runs[0].run_date), 'MMM dd, yyyy') : '-'}
          </div>
        </div>
      </div>

      {/* Create Payroll Run Form */}
      {showRunForm && (
        <div className="card">
          <h2>New Payroll Run</h2>
          <form onSubmit={handleCreateRun}>
            <div className="form-row">
              <div className="form-group">
                <label>Period Start *</label>
                <input
                  type="date"
                  value={formData.period_start}
                  onChange={(e) => setFormData({ ...formData, period_start: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Period End *</label>
                <input
                  type="date"
                  value={formData.period_end}
                  onChange={(e) => setFormData({ ...formData, period_end: e.target.value })}
                  required
                />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Run Date *</label>
                <input
                  type="date"
                  value={formData.run_date}
                  onChange={(e) => setFormData({ ...formData, run_date: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Notes</label>
                <input
                  type="text"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Optional notes"
                />
              </div>
            </div>
            <div className="form-actions">
              <button type="button" className="btn-secondary" onClick={() => setShowRunForm(false)}>
                Cancel
              </button>
              <button type="submit" className="btn-primary">
                Create Run
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Payroll Runs List */}
      <div className="card">
        <h2>Payroll Runs</h2>
        {runs.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📋</div>
            <div className="empty-title">No payroll runs yet</div>
            <div className="empty-description">Create your first payroll run</div>
          </div>
        ) : (
          <div className="table-container">
            <table className="payroll-table">
              <thead>
                <tr>
                  <th>Run #</th>
                  <th>Period</th>
                  <th>Date</th>
                  <th>Gross Pay</th>
                  <th>Deductions</th>
                  <th>Net Pay</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {runs.map((run) => (
                  <tr key={run.id}>
                    <td>{run.run_number}</td>
                    <td>
                      {format(new Date(run.period_start), 'MMM dd')} - {format(new Date(run.period_end), 'MMM dd, yyyy')}
                    </td>
                    <td>{format(new Date(run.run_date), 'MMM dd, yyyy')}</td>
                    <td>₦{run.total_gross_pay.toLocaleString()}</td>
                    <td>₦{run.total_deductions.toLocaleString()}</td>
                    <td>₦{run.total_net_pay.toLocaleString()}</td>
                    <td>
                      <span className={`badge badge-${run.status}`}>
                        {run.status}
                      </span>
                    </td>
                    <td>
                      <Link href={`/payroll/runs/${run.id}`}>
                        <button className="btn-secondary" style={{ padding: '0.25rem 0.75rem' }}>
                          View
                        </button>
                      </Link>
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
        .payroll-table {
          width: 100%;
          border-collapse: collapse;
        }
        .payroll-table th,
        .payroll-table td {
          padding: 0.875rem;
          text-align: left;
          border-bottom: 1px solid var(--border);
        }
        .payroll-table th {
          background: var(--bg-tertiary);
          font-weight: 600;
          color: var(--text-muted);
        }
        .badge-draft {
          background: var(--warning-dim);
          color: var(--warning);
        }
        .badge-processing {
          background: var(--info-dim);
          color: var(--info);
        }
        .badge-completed {
          background: var(--success-dim);
          color: var(--success);
        }
        .badge-cancelled {
          background: var(--danger-dim);
          color: var(--danger);
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
        @media (max-width: 768px) {
          .form-row {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}