'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

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
      <div>
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <p>Loading invoices...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div className="page-title">
          <h1>Invoices</h1>
          <p>Manage all your sales invoices</p>
        </div>
        <Link href="/sales/invoices/new">
          <button className="btn-primary">+ New Invoice</button>
        </Link>
      </div>

      <div className="card">
        {invoices.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem' }}>
            <div className="empty-icon" style={{ fontSize: '3rem', marginBottom: '1rem' }}>📄</div>
            <div className="empty-title" style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '0.5rem' }}>
              No invoices yet
            </div>
            <div className="empty-description" style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
              Create your first invoice to get started
            </div>
            <Link href="/sales/invoices/new">
              <button className="btn-primary">Create Invoice</button>
            </Link>
          </div>
        ) : (
          <div className="table-container">
            <table>
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
    </div>
  );
}