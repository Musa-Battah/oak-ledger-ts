'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';

interface DashboardStats {
  totalRevenue: number;
  outstandingInvoices: number;
  paidInvoices: number;
  totalCustomers: number;
  totalExpenses: number;
  outstandingBills: number;
  totalSuppliers: number;
}

interface RecentInvoice {
  id: string;
  invoice_number: string;
  customer_name: string;
  total: number;
  status: string;
  date: string;
}

export default function Dashboard(): React.ReactElement {
  const [stats, setStats] = useState<DashboardStats>({
    totalRevenue: 0,
    outstandingInvoices: 0,
    paidInvoices: 0,
    totalCustomers: 0,
    totalExpenses: 0,
    outstandingBills: 0,
    totalSuppliers: 0
  });
  const [recentInvoices, setRecentInvoices] = useState<RecentInvoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async (): Promise<void> => {
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
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div>
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <p>Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div className="page-title">
          <h1>Dashboard</h1>
          <p>Welcome back to Oak Ledger</p>
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
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <p>No invoices yet</p>
            <Link href="/sales/invoices/new">
              <button className="btn-primary" style={{ marginTop: '1rem' }}>
                Create First Invoice
              </button>
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
                    <td>{format(new Date(invoice.date), 'MMM dd, yyyy')}</td>
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