'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
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

export default function JournalEntryDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [entry, setEntry] = useState<JournalEntry | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEntry();
  }, []);

  const fetchEntry = async () => {
    try {
      const res = await fetch(`/api/journal/${params.id}`);
      const data = await res.json();
      if (data.success) {
        setEntry(data.data);
      } else {
        toast.error(data.error);
        router.push('/accounting/journal');
      }
    } catch (error) {
      toast.error('Error fetching journal entry');
      router.push('/accounting/journal');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="container">
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <p>Loading journal entry...</p>
        </div>
      </div>
    );
  }

  if (!entry) return null;

  return (
    <div className="container">
      <div className="page-header">
        <div className="page-title">
          <h1>Journal Entry {entry.entry_number}</h1>
          <p>{entry.description}</p>
        </div>
        <div className="action-buttons">
          <Link href="/accounting/journal">
            <button className="btn-secondary">Back</button>
          </Link>
        </div>
      </div>

      <div className="entry-details">
        <div className="card">
          <div className="detail-grid">
            <div className="detail-item">
              <label>Entry Number</label>
              <p>{entry.entry_number}</p>
            </div>
            <div className="detail-item">
              <label>Date</label>
              <p>{format(new Date(entry.date), 'MMM dd, yyyy')}</p>
            </div>
            <div className="detail-item">
              <label>Status</label>
              <p>
                <span className={`badge badge-${entry.status}`}>
                  {entry.status}
                </span>
              </p>
            </div>
            <div className="detail-item">
              <label>Reference</label>
              <p>{entry.reference || '-'}</p>
            </div>
            <div className="detail-item">
              <label>Created By</label>
              <p>{entry.created_by_name || 'System'}</p>
            </div>
            <div className="detail-item">
              <label>Created At</label>
              <p>{format(new Date(entry.created_at), 'MMM dd, yyyy HH:mm')}</p>
            </div>
          </div>
        </div>

        <div className="card">
          <h2>Journal Lines</h2>
          <div className="table-container">
            <table className="lines-table">
              <thead>
                <tr>
                  <th>Account</th>
                  <th>Debit (₦)</th>
                  <th>Credit (₦)</th>
                </tr>
              </thead>
              <tbody>
                {entry.lines.map((line, index) => (
                  <tr key={index}>
                    <td>{line.account_code} - {line.account_name}</td>
                    <td className="text-success">
                      {line.type === 'debit' ? `₦${line.amount.toLocaleString()}` : '-'}
                    </td>
                    <td className="text-success">
                      {line.type === 'credit' ? `₦${line.amount.toLocaleString()}` : '-'}
                    </td>
                  </tr>
                ))}
                <tr className="total-row">
                  <td><strong>Totals</strong></td>
                  <td><strong>₦{entry.total_debits.toLocaleString()}</strong></td>
                  <td><strong>₦{entry.total_credits.toLocaleString()}</strong></td>
                </tr>
              </tbody>
            </table>
          </div>
          {entry.status === 'posted' && (
            <div className="balanced-indicator">
              ✓ Entry is balanced and posted
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        .entry-details {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }
        .detail-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1rem;
        }
        .detail-item label {
          font-size: 0.75rem;
          color: var(--text-muted);
          text-transform: uppercase;
          display: block;
        }
        .detail-item p {
          font-size: 1rem;
          font-weight: 500;
          margin-top: 0.25rem;
        }
        .lines-table {
          width: 100%;
          border-collapse: collapse;
        }
        .lines-table th,
        .lines-table td {
          padding: 0.75rem;
          text-align: left;
          border-bottom: 1px solid var(--border);
        }
        .lines-table th {
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
        .balanced-indicator {
          margin-top: 1rem;
          padding: 0.75rem;
          background: var(--success-dim);
          color: var(--success);
          border-radius: 8px;
          text-align: center;
          font-weight: 500;
        }
        .badge-posted {
          background: var(--success-dim);
          color: var(--success);
        }
        .badge-draft {
          background: var(--warning-dim);
          color: var(--warning);
        }
        .badge-void {
          background: var(--danger-dim);
          color: var(--danger);
        }
        .text-success {
          color: var(--success);
        }
        @media (max-width: 768px) {
          .detail-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}