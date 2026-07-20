'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

interface JournalEntry {
  id: string;
  entry_number: string;
  date: string;
  description: string;
  reference: string;
  status: string;
  created_by_name: string;
  total_debits: number;
  total_credits: number;
  created_at: string;
  lines: Array<{
    account_name: string;
    account_code: string;
    amount: number;
    type: string;
  }>;
}

export default function JournalListPage() {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    page: 1,
    total: 0,
    totalPages: 1
  });

  useEffect(() => {
    fetchEntries();
  }, [pagination.page]);

  const fetchEntries = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/journal?page=${pagination.page}&limit=20`);
      const data = await res.json();
      if (data.success) {
        setEntries(data.data.entries);
        setPagination(data.data.pagination);
      } else {
        toast.error(data.error);
      }
    } catch (error) {
      toast.error('Error fetching journal entries');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="container">
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <p>Loading journal entries...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="page-header">
        <div className="page-title">
          <h1>Journal Entries</h1>
          <p>Record manual journal entries for adjustments, accruals, and corrections</p>
        </div>
        <Link href="/accounting/journal/new">
          <button className="btn-primary">+ New Journal Entry</button>
        </Link>
      </div>

      <div className="card">
        {entries.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📓</div>
            <div className="empty-title">No journal entries yet</div>
            <div className="empty-description">Create your first manual journal entry</div>
            <Link href="/accounting/journal/new">
              <button className="btn-primary">Create Journal Entry</button>
            </Link>
          </div>
        ) : (
          <>
            <div className="table-container">
              <table className="journal-list-table">
                <thead>
                  <tr>
                    <th>Entry #</th>
                    <th>Date</th>
                    <th>Description</th>
                    <th>Debit Total</th>
                    <th>Credit Total</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry) => (
                    <tr key={entry.id}>
                      <td>{entry.entry_number}</td>
                      <td>{format(new Date(entry.date), 'MMM dd, yyyy')}</td>
                      <td>{entry.description}</td>
                      <td className="text-success">₦{entry.total_debits.toLocaleString()}</td>
                      <td className="text-success">₦{entry.total_credits.toLocaleString()}</td>
                      <td>
                        <span className={`badge badge-${entry.status}`}>
                          {entry.status}
                        </span>
                      </td>
                      <td>
                        <Link href={`/accounting/journal/${entry.id}`}>
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

            {pagination.totalPages > 1 && (
              <div className="pagination-controls">
                <button
                  className="btn-secondary"
                  onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
                  disabled={pagination.page === 1}
                >
                  Previous
                </button>
                <span className="page-info">
                  Page {pagination.page} of {pagination.totalPages}
                </span>
                <button
                  className="btn-secondary"
                  onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
                  disabled={pagination.page === pagination.totalPages}
                >
                  Next
                </button>
              </div>
            )}
          </>
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
        .journal-list-table {
          width: 100%;
          border-collapse: collapse;
        }
        .journal-list-table th,
        .journal-list-table td {
          padding: 0.875rem;
          text-align: left;
          border-bottom: 1px solid var(--border);
        }
        .journal-list-table th {
          background: var(--bg-tertiary);
          font-weight: 600;
          color: var(--text-muted);
          font-size: 0.75rem;
          text-transform: uppercase;
        }
        .badge-draft {
          background: var(--warning-dim);
          color: var(--warning);
        }
        .badge-posted {
          background: var(--success-dim);
          color: var(--success);
        }
        .badge-void {
          background: var(--danger-dim);
          color: var(--danger);
        }
        .pagination-controls {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 1rem;
          margin-top: 1.5rem;
          padding-top: 1rem;
          border-top: 1px solid var(--border);
        }
        .page-info {
          color: var(--text-secondary);
          font-size: 0.875rem;
        }
      `}</style>
    </div>
  );
}