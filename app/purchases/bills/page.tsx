'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import ExportButton from '@/components/ExportButton';

interface Bill {
  id: string;
  bill_number: string;
  supplier_name: string;
  date: string;
  due_date: string;
  total: number;
  status: string;
}

export default function BillsList(): React.ReactElement {
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBills();
  }, []);

  const fetchBills = async (): Promise<void> => {
    try {
      const res = await fetch('/api/purchases/bills');
      const data = await res.json();
      
      if (data.success) {
        setBills(data.data || []);
      } else {
        toast.error(data.error || 'Failed to fetch bills');
      }
    } catch (error) {
      toast.error('Error fetching bills');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="container">
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <p>Loading bills...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="page-header">
        <div className="page-title">
          <h1>Bills</h1>
          <p>Manage all your supplier bills</p>
        </div>
        <div className="action-buttons">
          <ExportButton 
            exportUrl="/api/export/bills" 
            filename="bills" 
            buttonText="Export to Excel"
          />
          <Link href="/purchases/bills/new">
            <button className="btn-primary">+ New Bill</button>
          </Link>
        </div>
      </div>

      <div className="card">
        {bills.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📄</div>
            <div className="empty-title">No bills yet</div>
            <div className="empty-description">Create your first bill to track expenses</div>
            <Link href="/purchases/bills/new">
              <button className="btn-primary">Create Bill</button>
            </Link>
          </div>
        ) : (
          <div className="table-container">
            <table className="bills-table">
              <thead>
                <tr>
                  <th>Bill #</th>
                  <th>Supplier</th>
                  <th>Date</th>
                  <th>Due Date</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {bills.map((bill) => (
                  <tr key={bill.id}>
                    <td>{bill.bill_number}</td>
                    <td>{bill.supplier_name}</td>
                    <td>{format(new Date(bill.date), 'MMM dd, yyyy')}</td>
                    <td>{format(new Date(bill.due_date), 'MMM dd, yyyy')}</td>
                    <td>₦{bill.total.toLocaleString()}</td>
                    <td>
                      <span className={`badge badge-${bill.status}`}>
                        {bill.status}
                      </span>
                    </td>
                    <td>
                      <Link href={`/purchases/bills/${bill.id}`}>
                        <button className="btn-secondary">View</button>
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
        .bills-table {
          width: 100%;
          border-collapse: collapse;
        }
        .bills-table th,
        .bills-table td {
          padding: 0.875rem;
          text-align: left;
          border-bottom: 1px solid var(--border);
        }
        .bills-table th {
          background: var(--bg-tertiary);
          font-weight: 600;
          color: var(--text-muted);
        }
        .badge-draft {
          background: var(--warning-dim);
          color: var(--warning);
        }
        .badge-received {
          background: var(--info-dim);
          color: var(--info);
        }
        .badge-paid {
          background: var(--success-dim);
          color: var(--success);
        }
        .badge-overdue {
          background: var(--danger-dim);
          color: var(--danger);
        }
        .badge-cancelled {
          background: var(--danger-dim);
          color: var(--danger);
        }
      `}</style>
    </div>
  );
}