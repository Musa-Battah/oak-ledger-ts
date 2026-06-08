'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';

interface SalesStats {
  totalRevenue: number;
  outstandingInvoices: number;
  paidInvoices: number;
  totalCustomers: number;
}

interface RecentInvoice {
  id: string;
  invoice_number: string;
  customer_name: string;
  total: number;
  status: string;
  due_date: string;
}

export default function SalesOverview(): React.ReactElement {
  const [stats, setStats] = useState<SalesStats>({
    totalRevenue: 0,
    outstandingInvoices: 0,
    paidInvoices: 0,
    totalCustomers: 0
  });
  const [recentInvoices, setRecentInvoices] = useState<RecentInvoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async (): Promise<void> => {
    try {
      const [statsRes, invoicesRes] = await Promise.all([
        fetch('/api/sales/stats'),
        fetch('/api/sales/invoices?limit=5')
      ]);
      
      const statsData = await statsRes.json();
      const invoicesData = await invoicesRes.json();
      
      if (statsData.success) {
        setStats(statsData.data);
      }
      if (invoicesData.success) {
        setRecentInvoices(invoicesData.data || []);
      }
    } catch (error) {
      console.error('Error fetching sales data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div>
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <p>Loading sales data...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div className="page-title">
          <h1>Sales Overview</h1>
          <p>Track your income, invoices, and customer activity</p>
        </div>
        <div className="action-buttons">
          <Link href="/sales/invoices/new">
            <button className="btn-primary">+ New Invoice</button>
          </Link>
          <Link href="/sales/customers/new">
            <button className="btn-secondary">+ New Customer</button>
          </Link>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-title">Total Revenue</div>
          <div className="stat-value">₦{stats.totalRevenue.toLocaleString()}</div>
        </div>
        <div className="stat-card">
          <div className="stat-title">Outstanding Invoices</div>
          <div className="stat-value">₦{stats.outstandingInvoices.toLocaleString()}</div>
        </div>
        <div className="stat-card">
          <div className="stat-title">Paid Invoices</div>
          <div className="stat-value">{stats.paidInvoices}</div>
        </div>
        <div className="stat-card">
          <div className="stat-title">Total Customers</div>
          <div className="stat-value">{stats.totalCustomers}</div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Recent Invoices</h2>
          <Link href="/sales/invoices" className="nav-link">View All →</Link>
        </div>
        
        {recentInvoices.length === 0 ? (
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
                {recentInvoices.map((invoice) => (
                  <tr key={invoice.id}>
                    <td>{invoice.invoice_number}</td>
                    <td>{invoice.customer_name}</td>
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