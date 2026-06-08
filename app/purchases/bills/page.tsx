'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

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
      <div>
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <p>Loading bills...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div className="page-title">
          <h1>Bills</h1>
          <p>Manage all your supplier bills</p>
        </div>
        <Link href="/purchases/bills/new">
          <button className="btn-primary">+ New Bill</button>
        </Link>
      </div>

      <div className="card">
        {bills.length === 0 ? (
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
    </div>
  );
}