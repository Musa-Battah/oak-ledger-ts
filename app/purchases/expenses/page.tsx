'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

interface Account {
  id: string;
  name: string;
  code: string;
  type: string;
}

export default function ExpensesPage(): React.ReactElement {
  const router = useRouter();
  const [accounts, setAccounts] = useState<{ expenses: Account[]; assets: Account[] }>({
    expenses: [],
    assets: []
  });
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    description: '',
    amount: '',
    expense_account: '',
    payment_account: '',
    reference: ''
  });

  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async (): Promise<void> => {
    try {
      const res = await fetch('/api/accounts');
      const data = await res.json();
      
      if (data.success && data.data) {
        const expenseAccounts = data.data.accounts.filter((a: Account) => a.type === 'Expense');
        const assetAccounts = data.data.accounts.filter((a: Account) => a.type === 'Asset');
        setAccounts({ expenses: expenseAccounts, assets: assetAccounts });
      }
    } catch (error) {
      toast.error('Error loading accounts');
    }
  };

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    
    if (!formData.expense_account || !formData.payment_account) {
      toast.error('Please select both expense and payment accounts');
      return;
    }
    
    setLoading(true);
    
    try {
      const transaction = {
        date: formData.date,
        description: formData.description,
        reference_number: formData.reference,
        entries: [
          { account_id: formData.expense_account, amount: parseFloat(formData.amount), type: 'debit' },
          { account_id: formData.payment_account, amount: parseFloat(formData.amount), type: 'credit' }
        ]
      };
      
      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(transaction)
      });
      
      const data = await res.json();
      
      if (res.ok) {
        toast.success('Expense recorded successfully');
        router.push('/purchases/overview');
      } else {
        toast.error(data.error || 'Failed to record expense');
      }
    } catch (error) {
      toast.error('Error recording expense');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div className="page-title">
          <h1>Record Expense</h1>
          <p>Quick expense entry for everyday purchases</p>
        </div>
      </div>

      <div className="card">
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label>Date</label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label>Reference (Optional)</label>
              <input
                type="text"
                value={formData.reference}
                onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                placeholder="Receipt #, Bill #"
              />
            </div>
          </div>

          <div className="form-group">
            <label>Description</label>
            <input
              type="text"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="What was this expense for?"
              required
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Expense Category</label>
              <select
                value={formData.expense_account}
                onChange={(e) => setFormData({ ...formData, expense_account: e.target.value })}
                required
              >
                <option value="">Select expense type...</option>
                {accounts.expenses.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Payment Account</label>
              <select
                value={formData.payment_account}
                onChange={(e) => setFormData({ ...formData, payment_account: e.target.value })}
                required
              >
                <option value="">Select payment method...</option>
                {accounts.assets.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label>Amount (₦)</label>
            <input
              type="number"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              step="100"
              min="0"
              placeholder="0.00"
              required
            />
          </div>

          <div className="form-actions">
            <button type="button" onClick={() => router.back()} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? 'Recording...' : 'Record Expense'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}