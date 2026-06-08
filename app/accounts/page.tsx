'use client';

import { useState, useEffect } from 'react';
import { formatNaira } from '@/lib/format-client';

interface Account {
  id: string;
  code: string;
  name: string;
  type: string;
  normal_balance: string;
  balance: number;
  parent_account_id: string | null;
  is_active: boolean;
  description: string | null;
  children?: Account[];
}

interface AccountWithChildren extends Account {
  children: AccountWithChildren[];
}

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<AccountWithChildren[]>([]);
  const [flatAccounts, setFlatAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [expandedAccounts, setExpandedAccounts] = useState<Set<string>>(new Set());
  const [totals, setTotals] = useState<Record<string, number>>({});
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    type: 'Asset',
    normal_balance: 'debit',
    parent_account_id: '',
    description: ''
  });

  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/accounts');
      const data = await res.json();
      if (data.success && data.data) {
        setFlatAccounts(data.data.accounts);
        setAccounts(buildAccountTree(data.data.accounts));
        setTotals(data.data.totals);
      }
    } catch (error) {
      console.error('Error fetching accounts:', error);
    } finally {
      setLoading(false);
    }
  };

  const buildAccountTree = (accounts: Account[]): AccountWithChildren[] => {
    const accountMap = new Map<string, AccountWithChildren>();
    const roots: AccountWithChildren[] = [];

    accounts.forEach(account => {
      accountMap.set(account.id, { ...account, children: [] });
    });

    accounts.forEach(account => {
      const node = accountMap.get(account.id)!;
      if (account.parent_account_id && accountMap.has(account.parent_account_id)) {
        accountMap.get(account.parent_account_id)!.children.push(node);
      } else {
        roots.push(node);
      }
    });

    return roots;
  };

  const toggleExpand = (accountId: string) => {
    const newExpanded = new Set(expandedAccounts);
    if (newExpanded.has(accountId)) {
      newExpanded.delete(accountId);
    } else {
      newExpanded.add(accountId);
    }
    setExpandedAccounts(newExpanded);
  };

  const renderAccountTree = (accounts: AccountWithChildren[], level: number = 0) => {
    return accounts.map(account => (
      <div key={account.id} className="account-node">
        <div 
          className="account-row" 
          style={{ marginLeft: `${level * 20}px` }}
          onClick={() => {
            setSelectedAccount(account);
            setShowDetail(true);
          }}
        >
          <div className="account-expand" onClick={(e) => { e.stopPropagation(); toggleExpand(account.id); }}>
            {account.children.length > 0 && (expandedAccounts.has(account.id) ? '▼' : '▶')}
          </div>
          <div className="account-info">
            <span className="account-code">{account.code}</span>
            <span className="account-name">{account.name}</span>
            <span className={`account-type badge badge-${account.type.toLowerCase()}`}>
              {account.type}
            </span>
          </div>
          <div className="account-balance">
            {formatNaira(account.balance)}
          </div>
          <div className="account-actions" onClick={(e) => e.stopPropagation()}>
            <button 
              className="btn-secondary" 
              style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
              onClick={() => {
                setFormData({
                  code: account.code,
                  name: account.name,
                  type: account.type,
                  normal_balance: account.normal_balance,
                  parent_account_id: account.parent_account_id || '',
                  description: account.description || ''
                });
                setSelectedAccount(account);
                setShowModal(true);
              }}
            >
              Edit
            </button>
          </div>
        </div>
        {expandedAccounts.has(account.id) && account.children.length > 0 && (
          <div className="account-children">
            {renderAccountTree(account.children, level + 1)}
          </div>
        )}
      </div>
    ));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = selectedAccount ? `/api/accounts?id=${selectedAccount.id}` : '/api/accounts';
      const method = selectedAccount ? 'PUT' : 'POST';
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      
      if (res.ok) {
        setShowModal(false);
        fetchAccounts();
      }
    } catch (error) {
      console.error('Error saving account:', error);
    }
  };

  const getTypeIcon = (type: string) => {
    const icons: Record<string, string> = {
      Asset: '💰',
      Liability: '📝',
      Equity: '👥',
      Revenue: '📈',
      Expense: '💸'
    };
    return icons[type] || '📊';
  };

  if (loading) {
    return (
      <div>
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <p>Loading chart of accounts...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div className="page-title">
          <h1>Chart of Accounts</h1>
          <p>Manage your chart of accounts - the foundation of your accounting system</p>
        </div>
        <button 
          className="btn-primary"
          onClick={() => {
            setSelectedAccount(null);
            setFormData({
              code: '',
              name: '',
              type: 'Asset',
              normal_balance: 'debit',
              parent_account_id: '',
              description: ''
            });
            setShowModal(true);
          }}
        >
          + New Account
        </button>
      </div>

      {/* Summary Cards */}
      <div className="accounts-summary">
        {Object.entries(totals).map(([type, value]) => (
          <div key={type} className={`summary-card ${type.toLowerCase()}`}>
            <div className="label">{getTypeIcon(type)} {type}s</div>
            <div className="value">{formatNaira(value)}</div>
          </div>
        ))}
      </div>

      {/* Account Tree */}
      <div className="card">
        <h2 className="card-title">Account Hierarchy</h2>
        <div className="accounts-container">
          {renderAccountTree(accounts)}
        </div>
      </div>

      {/* Account Detail Modal */}
      {showDetail && selectedAccount && (
        <div className="modal-overlay" onClick={() => setShowDetail(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Account Details</h3>
              <button className="modal-close" onClick={() => setShowDetail(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="account-detail-header">
                <div>
                  <h2>{selectedAccount.code} - {selectedAccount.name}</h2>
                  <span className={`account-badge ${selectedAccount.type.toLowerCase()}`}>
                    {selectedAccount.type}
                  </span>
                  <span className="badge" style={{ marginLeft: '0.5rem' }}>
                    Normal Balance: {selectedAccount.normal_balance}
                  </span>
                </div>
                <div className="account-balance" style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
                  Balance: {formatNaira(selectedAccount.balance)}
                </div>
              </div>
              
              {selectedAccount.description && (
                <div className="form-row">
                  <label>Description</label>
                  <p style={{ color: 'var(--text-secondary)' }}>{selectedAccount.description}</p>
                </div>
              )}
              
              <div className="form-row">
                <label>Status</label>
                <p>
                  <span className={`badge ${selectedAccount.is_active ? 'badge-success' : 'badge-danger'}`}>
                    {selectedAccount.is_active ? 'Active' : 'Inactive'}
                  </span>
                </p>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowDetail(false)}>Close</button>
              <button 
                className="btn-primary" 
                onClick={() => {
                  setShowDetail(false);
                  setFormData({
                    code: selectedAccount.code,
                    name: selectedAccount.name,
                    type: selectedAccount.type,
                    normal_balance: selectedAccount.normal_balance,
                    parent_account_id: selectedAccount.parent_account_id || '',
                    description: selectedAccount.description || ''
                  });
                  setSelectedAccount(selectedAccount);
                  setShowModal(true);
                }}
              >
                Edit Account
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Account Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{selectedAccount ? 'Edit Account' : 'New Account'}</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-row">
                  <label>Account Code *</label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    placeholder="e.g., 1000, 2000"
                    required
                  />
                </div>
                <div className="form-row">
                  <label>Account Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Cash, Accounts Payable"
                    required
                  />
                </div>
                <div className="form-row">
                  <label>Account Type</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  >
                    <option value="Asset">Asset (💰)</option>
                    <option value="Liability">Liability (📝)</option>
                    <option value="Equity">Equity (👥)</option>
                    <option value="Revenue">Revenue (📈)</option>
                    <option value="Expense">Expense (💸)</option>
                  </select>
                </div>
                <div className="form-row">
                  <label>Normal Balance</label>
                  <select
                    value={formData.normal_balance}
                    onChange={(e) => setFormData({ ...formData, normal_balance: e.target.value })}
                  >
                    <option value="debit">Debit</option>
                    <option value="credit">Credit</option>
                  </select>
                </div>
                <div className="form-row">
                  <label>Parent Account</label>
                  <select
                    value={formData.parent_account_id}
                    onChange={(e) => setFormData({ ...formData, parent_account_id: e.target.value })}
                  >
                    <option value="">None (Top Level)</option>
                    {flatAccounts
                      .filter(a => a.type === formData.type && a.id !== selectedAccount?.id)
                      .map(account => (
                        <option key={account.id} value={account.id}>
                          {account.code} - {account.name}
                        </option>
                      ))}
                  </select>
                </div>
                <div className="form-row">
                  <label>Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    placeholder="Optional description of this account"
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary">
                  {selectedAccount ? 'Update Account' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}