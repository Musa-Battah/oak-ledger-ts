'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { useLoading } from '@/hooks/useLoading';
import DashboardCharts from '@/components/DashboardCharts';
import SkeletonLoader from '@/components/SkeletonLoader';

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

export default function DashboardPage() {
  const { isLoading, error, withLoading } = useLoading(true);
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

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    await withLoading(async () => {
      try {
        const [statsRes, invoicesRes] = await Promise.all([
          fetch('/api/sales/stats'),
          fetch('/api/sales/invoices?limit=5')
        ]);
        
        if (!statsRes.ok) throw new Error('Failed to fetch stats');
        if (!invoicesRes.ok) throw new Error('Failed to fetch invoices');
        
        const statsData = await statsRes.json();
        const invoicesData = await invoicesRes.json();
        
        if (statsData.success) {
          setStats(statsData.data);
        } else {
          throw new Error(statsData.error || 'Stats fetch failed');
        }
        
        if (invoicesData.success) {
          setRecentInvoices(invoicesData.data || []);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Error loading dashboard';
        toast.error(message);
        throw err;
      }
    });
  };

  if (isLoading) {
    return <SkeletonLoader type="card" rows={4} />;
  }

  if (error) {
    return (
      <div className="container">
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <div className="error-icon" style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚠️</div>
          <h2>Unable to Load Dashboard</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>{error}</p>
          <button className="btn-primary" onClick={() => window.location.reload()}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="page-header">
        <div className="page-title">
          <h1>Dashboard</h1>
          <p>Welcome back to Oak Ledger</p>
        </div>
      </div>

      {/* Stats Cards */}
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

      {/* Charts Section */}
      <DashboardCharts />

      {/* Recent Invoices */}
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
            <table className="dashboard-table">
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
                    <td>{new Date(invoice.date).toLocaleDateString()}</td>
                    <td>₦{invoice.total.toLocaleString()}</td>
                    <td>
                      <span className={`badge badge-${invoice.status}`}>
                        {invoice.status}
                      </span>
                    </td>
                    <td>
                      <Link href={`/sales/invoices/${invoice.id}`}>
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
        .dashboard-table {
          width: 100%;
          border-collapse: collapse;
        }
        .dashboard-table th,
        .dashboard-table td {
          padding: 0.875rem;
          text-align: left;
          border-bottom: 1px solid var(--border);
        }
        .dashboard-table th {
          background: var(--bg-tertiary);
          font-weight: 600;
          color: var(--text-muted);
        }
      `}</style>
    </div>
  );
};