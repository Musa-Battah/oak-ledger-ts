'use client';

import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

interface AuditLog {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  details: any;
  reason: string;
  created_at: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const ACTION_COLORS: Record<string, string> = {
  CREATE: 'badge-success',
  EDIT: 'badge-info',
  DELETE: 'badge-danger',
  VOID: 'badge-danger',
  UPDATE: 'badge-warning',
};

const ENTITY_ICONS: Record<string, string> = {
  invoice: '📄',
  bill: '📄',
  customer: '👤',
  supplier: '🏭',
  product: '📦',
  payment: '💰',
  transaction: '💳',
};

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 1
  });
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    entityType: '',
    action: '',
    startDate: '',
    endDate: ''
  });

  useEffect(() => {
    fetchLogs();
  }, [pagination.page, filters]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        ...(filters.entityType && { entityType: filters.entityType }),
        ...(filters.action && { action: filters.action }),
        ...(filters.startDate && { startDate: filters.startDate }),
        ...(filters.endDate && { endDate: filters.endDate })
      });
      
      const res = await fetch(`/api/audit-logs?${params}`);
      const data = await res.json();
      
      if (data.success) {
        setLogs(data.data.logs);
        setPagination(data.data.pagination);
      } else {
        toast.error(data.error || 'Failed to fetch audit logs');
      }
    } catch (error) {
      toast.error('Error fetching audit logs');
    } finally {
      setLoading(false);
    }
  };

  const formatAction = (action: string): string => {
    return action.charAt(0) + action.slice(1).toLowerCase();
  };

  const formatEntityType = (type: string): string => {
    const map: Record<string, string> = {
      invoice: 'Invoice',
      bill: 'Bill',
      customer: 'Customer',
      supplier: 'Supplier',
      product: 'Product',
      payment: 'Payment',
      transaction: 'Transaction'
    };
    return map[type] || type;
  };

  const renderDetails = (details: any): string => {
    if (!details) return '-';
    try {
      const parsed = typeof details === 'string' ? JSON.parse(details) : details;
      if (typeof parsed === 'object') {
        return Object.entries(parsed)
          .map(([key, value]) => `${key}: ${value}`)
          .join(', ');
      }
      return String(parsed);
    } catch {
      return String(details);
    }
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters({ ...filters, [key]: value });
    setPagination({ ...pagination, page: 1 });
  };

  const clearFilters = () => {
    setFilters({ entityType: '', action: '', startDate: '', endDate: '' });
    setPagination({ ...pagination, page: 1 });
  };

  if (loading && logs.length === 0) {
    return (
      <div className="container">
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <p>Loading audit logs...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="page-header">
        <div className="page-title">
          <h1>Audit Log</h1>
          <p>Track all changes made to your accounting system</p>
        </div>
        <div className="action-buttons">
          <button className="btn-secondary" onClick={clearFilters}>
            Clear Filters
          </button>
          <button className="btn-secondary" onClick={() => window.location.reload()}>
            Refresh
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="card filters-card">
        <div className="filters-grid">
          <div className="form-group">
            <label>Entity Type</label>
            <select
              value={filters.entityType}
              onChange={(e) => handleFilterChange('entityType', e.target.value)}
            >
              <option value="">All Types</option>
              <option value="invoice">Invoice</option>
              <option value="bill">Bill</option>
              <option value="customer">Customer</option>
              <option value="supplier">Supplier</option>
              <option value="product">Product</option>
              <option value="payment">Payment</option>
              <option value="transaction">Transaction</option>
            </select>
          </div>
          
          <div className="form-group">
            <label>Action</label>
            <select
              value={filters.action}
              onChange={(e) => handleFilterChange('action', e.target.value)}
            >
              <option value="">All Actions</option>
              <option value="CREATE">Create</option>
              <option value="EDIT">Edit</option>
              <option value="DELETE">Delete</option>
              <option value="VOID">Void</option>
              <option value="UPDATE">Update</option>
            </select>
          </div>
          
          <div className="form-group">
            <label>Start Date</label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => handleFilterChange('startDate', e.target.value)}
            />
          </div>
          
          <div className="form-group">
            <label>End Date</label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => handleFilterChange('endDate', e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Logs Table */}
      <div className="card">
        {logs.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📋</div>
            <div className="empty-title">No audit logs found</div>
            <div className="empty-description">
              {Object.values(filters).some(f => f) 
                ? 'Try adjusting your filters to see more logs'
                : 'System changes will appear here as they happen'}
            </div>
          </div>
        ) : (
          <>
            <div className="table-container">
              <table className="audit-table">
                <thead>
                  <tr>
                    <th>Date & Time</th>
                    <th>Action</th>
                    <th>Entity Type</th>
                    <th>Entity ID</th>
                    <th>Details</th>
                    <th>Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log.id}>
                      <td>{format(new Date(log.created_at), 'MMM dd, yyyy HH:mm:ss')}</td>
                      <td>
                        <span className={`badge ${ACTION_COLORS[log.action] || 'badge-info'}`}>
                          {formatAction(log.action)}
                        </span>
                      </td>
                      <td>
                        <span className="entity-badge">
                          {ENTITY_ICONS[log.entity_type] || '📄'} {formatEntityType(log.entity_type)}
                        </span>
                      </td>
                      <td>
                        <code className="entity-id">{log.entity_id.substring(0, 8)}...</code>
                      </td>
                      <td className="details-cell">{renderDetails(log.details)}</td>
                      <td>{log.reason || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
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
        .filters-card {
          margin-bottom: 1.5rem;
        }
        .filters-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1rem;
        }
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
        }
        .audit-table {
          width: 100%;
          border-collapse: collapse;
        }
        .audit-table th,
        .audit-table td {
          padding: 0.75rem;
          text-align: left;
          border-bottom: 1px solid var(--border);
        }
        .audit-table th {
          background: var(--bg-tertiary);
          font-weight: 600;
          color: var(--text-muted);
          font-size: 0.75rem;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .audit-table td {
          font-size: 0.875rem;
          color: var(--text-secondary);
        }
        .badge-success {
          background: var(--success-dim);
          color: var(--success);
        }
        .badge-info {
          background: var(--info-dim);
          color: var(--info);
        }
        .badge-danger {
          background: var(--danger-dim);
          color: var(--danger);
        }
        .badge-warning {
          background: var(--warning-dim);
          color: var(--warning);
        }
        .entity-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
        }
        .entity-id {
          background: var(--bg-tertiary);
          padding: 0.25rem 0.5rem;
          border-radius: 4px;
          font-size: 0.75rem;
          font-family: monospace;
        }
        .details-cell {
          max-width: 200px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
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
        @media (max-width: 768px) {
          .filters-grid {
            grid-template-columns: 1fr;
          }
          .audit-table {
            font-size: 0.75rem;
          }
          .audit-table th,
          .audit-table td {
            padding: 0.5rem;
          }
          .details-cell {
            max-width: 100px;
          }
        }
      `}</style>
    </div>
  );
}