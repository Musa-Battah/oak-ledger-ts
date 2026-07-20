'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

interface Account {
  id: string;
  code: string;
  name: string;
  type: string;
  normal_balance: string;
}

interface JournalLine {
  account_id: string;
  account_name?: string;
  account_code?: string;
  account_type?: string;
  amount: number;
  type: 'debit' | 'credit';
  description: string;
}

export default function NewJournalEntryPage() {
  const router = useRouter();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    description: '',
    reference: '',
    lines: [
      { account_id: '', amount: 0, type: 'debit' as 'debit', description: '' },
      { account_id: '', amount: 0, type: 'credit' as 'credit', description: '' }
    ] as JournalLine[]
  });

  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    try {
      const res = await fetch('/api/accounts');
      const data = await res.json();
      if (data.success) {
        setAccounts(data.data?.accounts || []);
      }
    } catch (error) {
      toast.error('Error loading accounts');
    }
  };

  const calculateTotals = () => {
    const totalDebits = formData.lines
      .filter(l => l.type === 'debit')
      .reduce((sum, l) => sum + l.amount, 0);
    const totalCredits = formData.lines
      .filter(l => l.type === 'credit')
      .reduce((sum, l) => sum + l.amount, 0);
    return { totalDebits, totalCredits, difference: totalDebits - totalCredits };
  };

  const addLine = () => {
    setFormData({
      ...formData,
      lines: [...formData.lines, { account_id: '', amount: 0, type: 'debit', description: '' }]
    });
  };

  const removeLine = (index: number) => {
    if (formData.lines.length <= 2) {
      toast.error('At least 2 lines required');
      return;
    }
    const newLines = formData.lines.filter((_, i) => i !== index);
    setFormData({ ...formData, lines: newLines });
  };

  const updateLine = (index: number, field: keyof JournalLine, value: any) => {
    const newLines = [...formData.lines];
    newLines[index] = { ...newLines[index], [field]: value };
    setFormData({ ...formData, lines: newLines });
  };

  const getCategory = (accountId: string) => {
    const account = accounts.find(a => a.id === accountId);
    if (!account) return '';
    return account.type;
  };

  const getSubCategory = (accountId: string) => {
    const account = accounts.find(a => a.id === accountId);
    if (!account) return '';
    const code = parseInt(account.code);
    if (account.type === 'Asset') {
      return code < 1100 ? 'Current Asset' : 'Non-Current Asset';
    }
    if (account.type === 'Liability') {
      return code < 2100 ? 'Current Liability' : 'Non-Current Liability';
    }
    return '';
  };

  const getFilteredAccounts = () => {
    if (!searchTerm) return accounts;
    return accounts.filter(a => 
      a.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.code.includes(searchTerm)
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const { totalDebits, totalCredits } = calculateTotals();
    if (Math.abs(totalDebits - totalCredits) > 0.01) {
      toast.error('Total debits must equal total credits');
      return;
    }

    if (formData.lines.some(l => !l.account_id || l.amount <= 0)) {
      toast.error('Please fill in all account and amount fields');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/journal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: formData.date,
          description: formData.description,
          reference: formData.reference,
          lines: formData.lines.map(({ account_id, amount, type, description }) => ({
            account_id,
            amount,
            type,
            description
          }))
        })
      });

      const data = await res.json();

      if (data.success) {
        toast.success('Journal entry created successfully!');
        router.push('/accounting/journal');
      } else {
        toast.error(data.error || 'Failed to create journal entry');
      }
    } catch (error) {
      toast.error('Error creating journal entry');
    } finally {
      setLoading(false);
    }
  };

  const { totalDebits, totalCredits, difference } = calculateTotals();
  const isBalanced = Math.abs(difference) < 0.01;
  const filteredAccounts = getFilteredAccounts();

  return (
    <div className="container">
      <div className="page-header">
        <div className="page-title">
          <h1>New Journal Entry</h1>
          <p>Record manual journal entries with debit and credit lines</p>
        </div>
      </div>

      <div className="card">
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label>Date *</label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label>Reference Number</label>
              <input
                type="text"
                value={formData.reference}
                onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                placeholder="Optional reference"
              />
            </div>
          </div>

          <div className="form-group">
            <label>Description *</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={2}
              placeholder="Brief description of the transaction"
              required
            />
          </div>

          <div className="journal-lines">
            <h3>Journal Lines</h3>
            <div className="table-container">
              <table className="journal-table">
                <thead>
                  <tr>
                    <th style={{ width: '30%' }}>Account</th>
                    <th style={{ width: '15%' }}>Category</th>
                    <th style={{ width: '15%' }}>Sub-Category</th>
                    <th style={{ width: '15%' }}>Debit (₦)</th>
                    <th style={{ width: '15%' }}>Credit (₦)</th>
                    <th style={{ width: '10%' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {formData.lines.map((line, index) => (
                    <tr key={index}>
                      <td>
                        <select
                          value={line.account_id}
                          onChange={(e) => updateLine(index, 'account_id', e.target.value)}
                          className="account-select"
                          required
                        >
                          <option value="">Select Account</option>
                          {filteredAccounts.map((account) => (
                            <option key={account.id} value={account.id}>
                              {account.code} - {account.name} ({account.type})
                            </option>
                          ))}
                        </select>
                        <input
                          type="text"
                          placeholder="Search accounts..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="account-search"
                        />
                      </td>
                      <td>
                        <span className="category-badge">
                          {getCategory(line.account_id)}
                        </span>
                      </td>
                      <td>
                        <span className="subcategory-badge">
                          {getSubCategory(line.account_id)}
                        </span>
                      </td>
                      <td>
                        {line.type === 'debit' && (
                          <input
                            type="number"
                            step="0.01"
                            value={line.amount || ''}
                            onChange={(e) => updateLine(index, 'amount', parseFloat(e.target.value) || 0)}
                            placeholder="0.00"
                            className="amount-input debit-input"
                          />
                        )}
                      </td>
                      <td>
                        {line.type === 'credit' && (
                          <input
                            type="number"
                            step="0.01"
                            value={line.amount || ''}
                            onChange={(e) => updateLine(index, 'amount', parseFloat(e.target.value) || 0)}
                            placeholder="0.00"
                            className="amount-input credit-input"
                          />
                        )}
                      </td>
                      <td>
                        <button
                          type="button"
                          onClick={() => removeLine(index)}
                          className="btn-danger"
                          style={{ padding: '0.25rem 0.5rem' }}
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button type="button" onClick={addLine} className="btn-secondary" style={{ marginTop: '1rem' }}>
              + Add Line
            </button>
          </div>

          <div className="totals-section">
            <div className="totals-row">
              <span>Total Debits:</span>
              <span className={totalDebits > 0 ? 'text-success' : ''}>
                ₦{totalDebits.toFixed(2)}
              </span>
            </div>
            <div className="totals-row">
              <span>Total Credits:</span>
              <span className={totalCredits > 0 ? 'text-success' : ''}>
                ₦{totalCredits.toFixed(2)}
              </span>
            </div>
            <div className="totals-row difference">
              <span>Difference:</span>
              <span className={isBalanced ? 'text-success' : 'text-danger'}>
                ₦{Math.abs(difference).toFixed(2)} {!isBalanced && '(Must be zero)'}
              </span>
            </div>
          </div>

          <div className="form-actions">
            <button type="button" onClick={() => router.back()} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={loading || !isBalanced} className="btn-primary">
              {loading ? 'Creating...' : 'Create Journal Entry'}
            </button>
          </div>
        </form>
      </div>

      <style jsx>{`
        .journal-table {
          width: 100%;
          border-collapse: collapse;
        }
        .journal-table th,
        .journal-table td {
          padding: 0.75rem;
          text-align: left;
          border-bottom: 1px solid var(--border);
        }
        .journal-table th {
          background: var(--bg-tertiary);
          font-weight: 600;
          color: var(--text-muted);
          font-size: 0.75rem;
          text-transform: uppercase;
        }
        .journal-lines h3 {
          margin: 1.5rem 0 1rem 0;
        }
        .account-select {
          width: 100%;
          padding: 0.5rem;
          background: var(--bg-secondary);
          border: 1px solid var(--border-light);
          border-radius: 4px;
          color: var(--text-primary);
          font-size: 0.875rem;
          margin-bottom: 0.25rem;
        }
        .account-select:focus {
          outline: none;
          border-color: var(--success);
        }
        .account-search {
          width: 100%;
          padding: 0.4rem;
          background: var(--bg-secondary);
          border: 1px solid var(--border-light);
          border-radius: 4px;
          color: var(--text-secondary);
          font-size: 0.75rem;
        }
        .account-search:focus {
          outline: none;
          border-color: var(--success);
        }
        .amount-input {
          width: 100%;
          padding: 0.5rem;
          background: var(--bg-secondary);
          border: 1px solid var(--border-light);
          border-radius: 4px;
          color: var(--text-primary);
          font-size: 0.875rem;
        }
        .amount-input:focus {
          outline: none;
          border-color: var(--success);
        }
        .category-badge {
          font-size: 0.75rem;
          color: var(--text-secondary);
        }
        .subcategory-badge {
          font-size: 0.75rem;
          color: var(--text-muted);
        }
        .totals-section {
          background: var(--bg-tertiary);
          padding: 1rem;
          border-radius: 8px;
          margin: 1.5rem 0;
        }
        .totals-row {
          display: flex;
          justify-content: space-between;
          padding: 0.5rem 0;
          font-size: 0.875rem;
        }
        .totals-row.difference {
          border-top: 1px solid var(--border);
          margin-top: 0.5rem;
          padding-top: 0.5rem;
          font-weight: 600;
        }
        .text-success {
          color: var(--success);
        }
        .text-danger {
          color: var(--danger);
        }
        @media (max-width: 768px) {
          .journal-table {
            font-size: 0.75rem;
          }
          .journal-table th,
          .journal-table td {
            padding: 0.5rem;
          }
        }
      `}</style>
    </div>
  );
}