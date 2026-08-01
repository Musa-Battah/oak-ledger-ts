'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

interface PayrollEntry {
  id: string;
  employee_id: string;
  employee_name: string;
  employee_code: string;
  gross_pay: number;
  tax_deduction: number;
  pension_deduction: number;
  nhf_deduction: number;
  health_insurance_deduction: number;
  other_deductions: number;
  total_deductions: number;
  net_pay: number;
  payment_status: string;
}

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
  notes: string;
  created_by_name: string;
  entries: PayrollEntry[];
}

export default function PayrollRunDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [run, setRun] = useState<PayrollRun | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRun();
  }, []);

  const fetchRun = async () => {
    try {
      const res = await fetch(`/api/payroll/runs/${params.id}`);
      const data = await res.json();
      if (data.success) {
        setRun(data.data);
      } else {
        toast.error(data.error);
        router.push('/payroll');
      }
    } catch (error) {
      toast.error('Error fetching payroll run');
      router.push('/payroll');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    try {
      const res = await fetch(`/api/payroll/runs/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'completed' })
      });
      
      if (res.ok) {
        toast.success('Payroll run approved');
        fetchRun();
      } else {
        toast.error('Failed to approve');
      }
    } catch (error) {
      toast.error('Error approving payroll run');
    }
  };

  if (loading) {
    return (
      <div className="container">
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <p>Loading payroll run...</p>
        </div>
      </div>
    );
  }

  if (!run) return null;

  return (
    <div className="container">
      <div className="page-header">
        <div className="page-title">
          <h1>Payroll Run {run.run_number}</h1>
          <p>Period: {format(new Date(run.period_start), 'MMM dd, yyyy')} - {format(new Date(run.period_end), 'MMM dd, yyyy')}</p>
        </div>
        <div className="action-buttons">
          <Link href="/payroll">
            <button className="btn-secondary">Back</button>
          </Link>
          {run.status === 'draft' && (
            <button className="btn-primary" onClick={handleApprove}>
              Approve & Complete
            </button>
          )}
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-title">Total Gross Pay</div>
          <div className="stat-value">₦{run.total_gross_pay.toLocaleString()}</div>
        </div>
        <div className="stat-card">
          <div className="stat-title">Total Deductions</div>
          <div className="stat-value">₦{run.total_deductions.toLocaleString()}</div>
        </div>
        <div className="stat-card">
          <div className="stat-title">Total Net Pay</div>
          <div className="stat-value">₦{run.total_net_pay.toLocaleString()}</div>
        </div>
        <div className="stat-card">
          <div className="stat-title">Status</div>
          <div className="stat-value">
            <span className={`badge badge-${run.status}`}>
              {run.status.toUpperCase()}
            </span>
          </div>
        </div>
      </div>

      <div className="card">
        <h2>Employee Payroll Entries</h2>
        <div className="table-container">
          <table className="entries-table">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Code</th>
                <th>Gross Pay</th>
                <th>Tax (PAYE)</th>
                <th>Pension</th>
                <th>NHF</th>
                <th>Total Deductions</th>
                <th>Net Pay</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {run.entries.map((entry) => (
                <tr key={entry.id}>
                  <td>{entry.employee_name}</td>
                  <td>{entry.employee_code}</td>
                  <td>₦{entry.gross_pay.toLocaleString()}</td>
                  <td>₦{entry.tax_deduction.toLocaleString()}</td>
                  <td>₦{entry.pension_deduction.toLocaleString()}</td>
                  <td>₦{entry.nhf_deduction.toLocaleString()}</td>
                  <td>₦{entry.total_deductions.toLocaleString()}</td>
                  <td>₦{entry.net_pay.toLocaleString()}</td>
                  <td>
                    <span className={`badge badge-${entry.payment_status}`}>
                      {entry.payment_status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="total-row">
                <td colSpan={2}><strong>Totals</strong></td>
                <td><strong>₦{run.total_gross_pay.toLocaleString()}</strong></td>
                <td colSpan={2}></td>
                <td></td>
                <td><strong>₦{run.total_deductions.toLocaleString()}</strong></td>
                <td><strong>₦{run.total_net_pay.toLocaleString()}</strong></td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <style jsx>{`
        .entries-table {
          width: 100%;
          border-collapse: collapse;
        }
        .entries-table th,
        .entries-table td {
          padding: 0.75rem;
          text-align: left;
          border-bottom: 1px solid var(--border);
        }
        .entries-table th {
          background: var(--bg-tertiary);
          font-weight: 600;
          color: var(--text-muted);
          font-size: 0.75rem;
          text-transform: uppercase;
        }
        .total-row {
          background: var(--bg-tertiary);
          font-weight: 600;
        }
        .badge-draft {
          background: var(--warning-dim);
          color: var(--warning);
        }
        .badge-completed {
          background: var(--success-dim);
          color: var(--success);
        }
        .badge-pending {
          background: var(--warning-dim);
          color: var(--warning);
        }
        .badge-paid {
          background: var(--success-dim);
          color: var(--success);
        }
      `}</style>
    </div>
  );
}