'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import ExportButton from '@/components/ExportButton';

interface Invoice {
  id: string;
  invoice_number: string;
  customer_name: string;
  date: string;
  due_date: string;
  total: number;
  status: string;
}

export default function InvoicesList(): React.ReactElement {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchInvoices();
  }, []);

  const fetchInvoices = async (): Promise<void> => {
    try {
      const res = await fetch('/api/sales/invoices');
      const data = await res.json();
      
      if (data.success) {
        setInvoices(data.data || []);
      } else {
        toast.error(data.error || 'Failed to fetch invoices');
      }
    } catch (error) {
      toast.error('Error fetching invoices');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="container">
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <p>Loading invoices...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="page-header">
        <div className="page-title">
          <h1>Invoices</h1>
          <p>Manage all your sales invoices</p>
        </div>
        <div className="action-buttons">
          <ExportButton 
            exportUrl="/api/export/invoices" 
            filename="invoices" 
            buttonText="Export to Excel"
          />
          <Link href="/sales/invoices/new">
            <button className="btn-primary">+ New Invoice</button>
          </Link>
        </div>
      </div>

      <div className="card">
        {invoices.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📄</div>
            <div className="empty-title">No invoices yet</div>
            <div className="empty-description">Create your first invoice to get started</div>
            <Link href="/sales/invoices/new">
              <button className="btn-primary">Create Invoice</button>
            </Link>
          </div>
        ) : (
          <div className="table-container">
            <table className="invoices-table">
              <thead>
                <tr>
                  <th>Invoice #</th>
                  <th>Customer</th>
                  <th>Date</th>
                  <th>Due Date</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((invoice) => (
                  <tr key={invoice.id}>
                    <td>{invoice.invoice_number}</td>
                    <td>{invoice.customer_name}</td>
                    <td>{format(new Date(invoice.date), 'MMM dd, yyyy')}</td>
                    <td>{format(new Date(invoice.due_date), 'MMM dd, yyyy')}</td>
                    <td>₦{invoice.total.toLocaleString()}</td>
                    <td>
                      <span className={`badge badge-${invoice.status}`}>
                        {invoice.status}
                      </span>
                    </td>
                    <td>
                      <Link href={`/sales/invoices/${invoice.id}`}>
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
        .invoices-table {
          width: 100%;
          border-collapse: collapse;
        }
        .invoices-table th,
        .invoices-table td {
          padding: 0.875rem;
          text-align: left;
          border-bottom: 1px solid var(--border);
        }
        .invoices-table th {
          background: var(--bg-tertiary);
          font-weight: 600;
          color: var(--text-muted);
        }
      `}</style>
    </div>
  );
}