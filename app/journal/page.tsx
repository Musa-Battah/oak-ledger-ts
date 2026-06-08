'use client';

import { useState, useEffect } from 'react';
import { formatNaira, formatDate } from '@/lib/format-client';

interface JournalEntry {
  id: string;
  date: string;
  description: string;
  reference_number: string | null;
  type: string;
  status: string;
  entries: Array<{
    account_name: string;
    account_code: string;
    amount: number;
    type: 'debit' | 'credit';
  }>;
}

export default function JournalPage() {
  const [transactions, setTransactions] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    type: ''
  });

  useEffect(() => {
    fetchTransactions();
  }, [filters]);

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      let url = '/api/transactions?limit=100';
      if (filters.startDate) url += `&startDate=${filters.startDate}`;
      if (filters.endDate) url += `&endDate=${filters.endDate}`;
      if (filters.type) url += `&type=${filters.type}`;
      
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setTransactions(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTransactionTypeBadge = (type: string) => {
    return `transaction-type ${type}`;
  };

  const toggleExpand = (id: string) => {
    setExpandedRow(expandedRow === id ? null : id);
  };

  const calculateTotal = (entries: JournalEntry['entries']) => {
    return entries.reduce((sum, e) => sum + e.amount, 0) / 2;
  };

  if (loading) {
    return (
      <div>
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <p>Loading journal entries...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div className="page-title">
          <h1>Journal Entries</h1>
          <p>View all accounting transactions and their journal entries</p>
        </div>
      </div>

      <div className="card">
        {/* Filters */}
        <div className="journal-filters">
          <div className="filter-group">
            <label>From Date</label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
            />
          </div>
          <div className="filter-group">
            <label>To Date</label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
            />
          </div>
          <div className="filter-group">
            <label>Type</label>
            <select
              value={filters.type}
              onChange={(e) => setFilters({ ...filters, type: e.target.value })}
            >
              <option value="">All Types</option>
              <option value="invoice">Invoice</option>
              <option value="bill">Bill</option>
              <option value="expense">Expense</option>
              <option value="transfer">Transfer</option>
              <option value="journal">Journal</option>
            </select>
          </div>
        </div>

        {/* Transactions Table */}
        <div className="table-container">
          <table className="journal-table">
            <thead>
              <tr>
                <th style={{ width: '30px' }}></th>
                <th>Date</th>
                <th>Reference</th>
                <th>Description</th>
                <th>Type</th>
                <th>Amount</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '2rem' }}>
                    No journal entries found
                  </td>
                </tr>
              ) : (
                transactions.map((transaction) => {
                  const total = calculateTotal(transaction.entries);
                  return (
                    <>
                      <tr key={transaction.id} className="entry-row" onClick={() => toggleExpand(transaction.id)}>
                        <td>
                          <button className="expand-btn">
                            {expandedRow === transaction.id ? '▼' : '▶'}
                          </button>
                        </td>
                        <td>{formatDate(transaction.date)}</td>
                        <td>{transaction.reference_number || '-'}</td>
                        <td>{transaction.description}</td>
                        <td>
                          <span className={getTransactionTypeBadge(transaction.type)}>
                            {transaction.type}
                          </span>
                        </td>
                        <td className={total >= 0 ? 'text-success' : 'text-danger'}>
                          {formatNaira(total)}
                        </td>
                        <td>
                          <span className="badge badge-success">{transaction.status}</span>
                        </td>
                      </tr>
                      {expandedRow === transaction.id && (
                        <tr className="entry-details-expanded">
                          <td colSpan={7}>
                            <div style={{ padding: '0.5rem' }}>
                              <strong>Journal Entries:</strong>
                              <ul className="entry-details" style={{ marginTop: '0.5rem' }}>
                                {transaction.entries.map((entry, idx) => (
                                  <li key={idx}>
                                    <span style={{ fontFamily: 'monospace' }}>{entry.account_code}</span>
                                    {' - '}
                                    {entry.account_name}
                                    <span style={{ float: 'right' }}>
                                      {entry.type === 'debit' ? (
                                        <span className="entry-debit">Debit: {formatNaira(entry.amount)}</span>
                                      ) : (
                                        <span className="entry-credit">Credit: {formatNaira(entry.amount)}</span>
                                      )}
                                    </span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}