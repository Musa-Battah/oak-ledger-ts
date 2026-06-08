'use client';

import Link from 'next/link';

export default function Home(): React.ReactElement {
  return (
    <div>
      <div className="hero" style={{ textAlign: 'center', padding: '3rem 1rem' }}>
        <h1 style={{ fontSize: '3rem', marginBottom: '1rem' }}>
          Welcome to Oak Ledger
        </h1>
        <p style={{ fontSize: '1.25rem', color: 'var(--text-secondary)', marginBottom: '2rem' }}>
          Professional Double-Entry Accounting System for Nigerian Businesses
        </p>
        <Link href="/sales/invoices/new">
          <button className="btn-primary" style={{ fontSize: '1.125rem', padding: '1rem 2rem' }}>
            Get Started
          </button>
        </Link>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-title">Smart Accounting</div>
          <div className="stat-value">Double-Entry</div>
        </div>
        <div className="stat-card">
          <div className="stat-title">Nigerian VAT Ready</div>
          <div className="stat-value">7.5%</div>
        </div>
        <div className="stat-card">
          <div className="stat-title">Real-time Reports</div>
          <div className="stat-value">Instant</div>
        </div>
      </div>

      <div className="card">
        <h2 className="card-title">Features</h2>
        <ul style={{ marginLeft: '1.5rem', lineHeight: '1.8' }}>
          <li>✓ Invoicing & Billing</li>
          <li>✓ Expense Tracking</li>
          <li>✓ Customer & Supplier Management</li>
          <li>✓ Financial Reports (P&L, Balance Sheet)</li>
          <li>✓ Nigerian Naira (₦) Support</li>
          <li>✓ VAT Calculation (7.5%)</li>
        </ul>
      </div>
    </div>
  );
}