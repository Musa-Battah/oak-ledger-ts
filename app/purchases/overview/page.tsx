'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';

interface PurchasesStats {
  totalExpenses: number;
  outstandingBills: number;
  totalSuppliers: number;
}

interface RecentBill {
  id: string;
  bill_number: string;
  supplier_name: string;
  total: number;
  status: string;
  due_date: string;
}

export default function PurchasesOverview(): React.ReactElement {
  const [stats, setStats] = useState<PurchasesStats>({
    totalExpenses: 0,
    outstandingBills: 0,
    totalSuppliers: 0
  });
  const [recentBills, setRecentBills] = useState<RecentBill[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async (): Promise<void> => {
    try {
      const [statsRes, billsRes] = await Promise.all([
        fetch('/api/purchases/stats'),
        fetch('/api/purchases/bills?limit=5')
      ]);
      
      const statsData = await statsRes.json();
      const billsData = await billsRes.json();
      
      if (statsData.success) {
        setStats(statsData.data);
      }
      if (billsData.success) {
        setRecentBills(billsData.data || []);
      }
    } catch (error) {
      console.error('Error fetching purchases data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div>
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <p>Loading purchases data...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div className="page-title">
          <h1>Purchases Overview</h1>
          <p>Track your expenses, bills, and supplier activity</p>
        </div>
        <div className="action-buttons">
          <Link href="/purchases/bills/new">
            <button className="btn-primary">+ New Bill</button>
          </Link>
          <Link href="/purchases/suppliers/new">
            <button className="btn-secondary">+ New Supplier</button>
          </Link>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-title">Total Expenses</div>
          <div className="stat-value">₦{stats.totalExpenses.toLocaleString()}</div>
        </div>
        <div className="stat-card">
          <div className="stat-title">Outstanding Bills</div>
          <div className="stat-value">₦{stats.outstandingBills.toLocaleString()}</div>
        </div>
        <div className="stat-card">
          <div className="stat-title">Total Suppliers</div>
          <div className="stat-value">{stats.totalSuppliers}</div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Recent Bills</h2>
          <Link href="/purchases/bills" className="nav-link">View All →</Link>
        </div>
        
        {recentBills.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem' }}>
            <div className="empty-icon" style={{ fontSize: '3rem', marginBottom: '1rem' }}>📄</div>
            <div className="empty-title" style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '0.5rem' }}>
              No bills yet
            </div>
            <div className="empty-description" style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
              Create your first bill to track expenses
            </div>
            <Link href="/purchases/bills/new">
              <button className="btn-primary">Create Bill</button>
            </Link>
          </div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Bill #</th>
                  <th>Supplier</th>
                  <th>Due Date</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {recentBills.map((bill) => (
                  <tr key={bill.id}>
                    <td>{bill.bill_number}</td>
                    <td>{bill.supplier_name}</td>
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
    </div>
  );
}