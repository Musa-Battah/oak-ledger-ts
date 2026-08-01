'use client';

import { useState } from 'react';
import CSVImporter from '@/components/CSVImporter';

export default function ImportPage() {
  const [importType, setImportType] = useState<'customers' | 'products'>('customers');

  return (
    <div className="container">
      <div className="page-header">
        <div className="page-title">
          <h1>Import Data</h1>
          <p>Import customers, products, and more from CSV or Excel files</p>
        </div>
      </div>

      <div className="card">
        <div className="import-tabs">
          <button 
            className={`tab-btn ${importType === 'customers' ? 'active' : ''}`}
            onClick={() => setImportType('customers')}
          >
            Import Customers
          </button>
          <button 
            className={`tab-btn ${importType === 'products' ? 'active' : ''}`}
            onClick={() => setImportType('products')}
          >
            Import Products
          </button>
        </div>

        <div className="import-content">
          <CSVImporter 
            type={importType} 
            onSuccess={() => {
              // Refresh data after import
            }}
          />
        </div>
      </div>

      <div className="card">
        <h2>Download Templates</h2>
        <p className="template-description">
          Download a template file to see the required format for importing your data.
        </p>
        <div className="template-buttons">
          <a href="/templates/customers_template.csv" download className="btn-secondary">
            📄 Customer Template
          </a>
          <a href="/templates/products_template.csv" download className="btn-secondary">
            📄 Product Template
          </a>
        </div>
      </div>

      <style jsx>{`
        .import-tabs {
          display: flex;
          gap: 1rem;
          margin-bottom: 2rem;
          border-bottom: 1px solid var(--border);
          padding-bottom: 0.5rem;
        }
        .tab-btn {
          background: none;
          border: none;
          padding: 0.75rem 1.5rem;
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          color: var(--text-secondary);
          border-radius: 8px 8px 0 0;
          transition: all 0.3s ease;
        }
        .tab-btn:hover {
          color: var(--text-primary);
          background: var(--bg-tertiary);
        }
        .tab-btn.active {
          color: var(--success);
          background: var(--success-dim);
        }
        .import-content {
          min-height: 300px;
        }
        .template-description {
          color: var(--text-secondary);
          margin-bottom: 1.5rem;
        }
        .template-buttons {
          display: flex;
          gap: 1rem;
          flex-wrap: wrap;
        }
      `}</style>
    </div>
  );
}