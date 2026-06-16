'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface DashboardStats {
  totalRevenue: number;
  totalCustomers: number;
  totalSuppliers: number;
  totalProducts: number;
  outstandingInvoices: number;
  totalBills: number;
}

export default function HomePage() {
  const [stats, setStats] = useState<DashboardStats>({
    totalRevenue: 0,
    totalCustomers: 0,
    totalSuppliers: 0,
    totalProducts: 0,
    outstandingInvoices: 0,
    totalBills: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/sales/stats');
      const data = await res.json();
      if (data.success) {
        setStats(data.data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const features = [
    {
      icon: '📄',
      title: 'Invoicing',
      description: 'Create and manage professional invoices for your customers',
      link: '/sales/invoices/new',
      linkText: 'Create Invoice →'
    },
    {
      icon: '💰',
      title: 'Payment Tracking',
      description: 'Record customer payments and track outstanding balances',
      link: '/sales/invoices',
      linkText: 'View Invoices →'
    },
    {
      icon: '📊',
      title: 'Financial Reports',
      description: 'Generate IFRS-compliant financial statements instantly',
      link: '/reports/profit-loss',
      linkText: 'View Reports →'
    },
    {
      icon: '🏷️',
      title: 'VAT Management',
      description: 'Track and report Nigerian VAT (7.5%) with FIRS-compliant reports',
      link: '/reports/tax',
      linkText: 'View VAT Report →'
    },
    {
      icon: '👥',
      title: 'Customer Management',
      description: 'Maintain a complete customer database with transaction history',
      link: '/sales/customers',
      linkText: 'Manage Customers →'
    },
    {
      icon: '📦',
      title: 'Product Catalog',
      description: 'Manage your products and services with pricing and inventory',
      link: '/sales/products',
      linkText: 'View Products →'
    }
  ];

  const quickActions = [
    { icon: '+', label: 'New Invoice', href: '/sales/invoices/new', color: 'primary' },
    { icon: '+', label: 'New Bill', href: '/purchases/bills/new', color: 'secondary' },
    { icon: '📊', label: 'Dashboard', href: '/dashboard', color: 'info' },
    { icon: '📄', label: 'Reports', href: '/reports/profit-loss', color: 'success' }
  ];

  if (loading) {
    return (
      <div className="home-loading">
        <div className="spinner"></div>
        <p>Loading Oak Ledger...</p>
        <style jsx>{`
          .home-loading {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 60vh;
            gap: 1rem;
          }
          .spinner {
            width: 48px;
            height: 48px;
            border: 3px solid var(--border);
            border-top-color: var(--success);
            border-radius: 50%;
            animation: spin 1s linear infinite;
          }
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="home-container">
      {/* Hero Section */}
      <div className="hero-section">
        <div className="hero-content">
          <div className="hero-badge">🌳 Double-Entry Accounting</div>
          <h1 className="hero-title">
            Professional Accounting for <span className="highlight">Nigerian Businesses</span>
          </h1>
          <p className="hero-description">
            Manage invoices, track payments, generate IFRS-compliant reports, 
            and stay compliant with Nigerian tax regulations — all in one place.
          </p>
          <div className="hero-actions">
            <Link href="/sales/invoices/new">
              <button className="btn-primary hero-btn">Get Started</button>
            </Link>
            <Link href="/dashboard">
              <button className="btn-secondary hero-btn">Go to Dashboard</button>
            </Link>
          </div>
        </div>
        <div className="hero-stats">
          <div className="stat-item">
            <span className="stat-number">₦{stats.totalRevenue.toLocaleString()}</span>
            <span className="stat-label">Total Revenue</span>
          </div>
          <div className="stat-divider"></div>
          <div className="stat-item">
            <span className="stat-number">{stats.totalCustomers}</span>
            <span className="stat-label">Customers</span>
          </div>
          <div className="stat-divider"></div>
          <div className="stat-item">
            <span className="stat-number">{stats.totalSuppliers}</span>
            <span className="stat-label">Suppliers</span>
          </div>
          <div className="stat-divider"></div>
          <div className="stat-item">
            <span className="stat-number">{stats.totalProducts}</span>
            <span className="stat-label">Products</span>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="quick-actions">
        <h2>Quick Actions</h2>
        <div className="quick-actions-grid">
          {quickActions.map((action, index) => (
            <Link key={index} href={action.href}>
              <button className={`quick-action-btn ${action.color}`}>
                <span className="action-icon">{action.icon}</span>
                {action.label}
              </button>
            </Link>
          ))}
        </div>
      </div>

      {/* Features Grid */}
      <div className="features-section">
        <h2>Everything You Need to Run Your Business</h2>
        <div className="features-grid">
          {features.map((feature, index) => (
            <div key={index} className="feature-card">
              <div className="feature-icon">{feature.icon}</div>
              <h3>{feature.title}</h3>
              <p>{feature.description}</p>
              <Link href={feature.link} className="feature-link">
                {feature.linkText}
              </Link>
            </div>
          ))}
        </div>
      </div>

      {/* Nigerian Focus Section */}
      <div className="nigeria-section">
        <div className="nigeria-content">
          <div className="nigeria-badge">🇳🇬 Nigerian Focus</div>
          <h2>Built for Nigerian Businesses</h2>
          <p>
            Oak Ledger is designed specifically for the Nigerian business environment 
            with support for Naira (₦), 7.5% VAT, FIRS-compliant reporting, 
            and IFRS financial statements.
          </p>
          <div className="nigeria-features">
            <div className="nigeria-feature">
              <span>₦</span>
              <span>Naira Currency Support</span>
            </div>
            <div className="nigeria-feature">
              <span>📊</span>
              <span>7.5% VAT Calculation</span>
            </div>
            <div className="nigeria-feature">
              <span>📋</span>
              <span>FIRS-Compliant Reports</span>
            </div>
            <div className="nigeria-feature">
              <span>📄</span>
              <span>IFRS Financial Statements</span>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .home-container {
          padding: 1rem 0;
        }

        /* Hero Section */
        .hero-section {
          background: linear-gradient(135deg, var(--bg-card) 0%, var(--bg-secondary) 100%);
          border: 1px solid var(--border);
          border-radius: 16px;
          padding: 3rem;
          margin-bottom: 2rem;
          position: relative;
          overflow: hidden;
        }
        .hero-section::before {
          content: '';
          position: absolute;
          top: -50%;
          right: -20%;
          width: 600px;
          height: 600px;
          background: radial-gradient(circle, rgba(16, 185, 129, 0.05) 0%, transparent 70%);
          border-radius: 50%;
          pointer-events: none;
        }
        .hero-content {
          max-width: 600px;
          position: relative;
          z-index: 1;
        }
        .hero-badge {
          display: inline-block;
          background: var(--success-dim);
          color: var(--success);
          padding: 0.25rem 0.75rem;
          border-radius: 20px;
          font-size: 0.75rem;
          font-weight: 600;
          margin-bottom: 1rem;
        }
        .hero-title {
          font-size: 2.5rem;
          font-weight: 700;
          line-height: 1.2;
          margin-bottom: 1rem;
          color: var(--text-primary);
        }
        .hero-title .highlight {
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .hero-description {
          font-size: 1.125rem;
          color: var(--text-secondary);
          line-height: 1.6;
          margin-bottom: 1.5rem;
        }
        .hero-actions {
          display: flex;
          gap: 1rem;
        }
        .hero-btn {
          padding: 0.75rem 2rem;
          font-size: 1rem;
        }
        .hero-stats {
          display: flex;
          align-items: center;
          gap: 2rem;
          margin-top: 2rem;
          padding-top: 2rem;
          border-top: 1px solid var(--border);
          position: relative;
          z-index: 1;
        }
        .stat-item {
          display: flex;
          flex-direction: column;
        }
        .stat-number {
          font-size: 1.5rem;
          font-weight: 700;
          color: var(--text-primary);
        }
        .stat-label {
          font-size: 0.75rem;
          color: var(--text-muted);
        }
        .stat-divider {
          width: 1px;
          height: 40px;
          background: var(--border);
        }

        /* Quick Actions */
        .quick-actions {
          margin-bottom: 2rem;
        }
        .quick-actions h2 {
          font-size: 1rem;
          font-weight: 600;
          margin-bottom: 1rem;
          color: var(--text-secondary);
        }
        .quick-actions-grid {
          display: flex;
          gap: 1rem;
          flex-wrap: wrap;
        }
        .quick-action-btn {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1.25rem;
          border-radius: 8px;
          border: none;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.3s ease;
        }
        .quick-action-btn:hover {
          transform: translateY(-2px);
        }
        .action-icon {
          font-size: 1.125rem;
        }
        .quick-action-btn.primary {
          background: var(--success-dim);
          color: var(--success);
        }
        .quick-action-btn.primary:hover {
          background: var(--success);
          color: white;
        }
        .quick-action-btn.secondary {
          background: var(--info-dim);
          color: var(--info);
        }
        .quick-action-btn.secondary:hover {
          background: var(--info);
          color: white;
        }
        .quick-action-btn.info {
          background: var(--warning-dim);
          color: var(--warning);
        }
        .quick-action-btn.info:hover {
          background: var(--warning);
          color: white;
        }
        .quick-action-btn.success {
          background: var(--success-dim);
          color: var(--success);
        }
        .quick-action-btn.success:hover {
          background: var(--success);
          color: white;
        }

        /* Features Section */
        .features-section {
          margin-bottom: 2rem;
        }
        .features-section h2 {
          font-size: 1.5rem;
          font-weight: 700;
          text-align: center;
          margin-bottom: 2rem;
          color: var(--text-primary);
        }
        .features-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 1.5rem;
        }
        .feature-card {
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 1.5rem;
          transition: all 0.3s ease;
        }
        .feature-card:hover {
          border-color: var(--success);
          transform: translateY(-4px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        }
        .feature-icon {
          font-size: 2.5rem;
          margin-bottom: 1rem;
        }
        .feature-card h3 {
          font-size: 1.125rem;
          font-weight: 600;
          margin-bottom: 0.5rem;
          color: var(--text-primary);
        }
        .feature-card p {
          font-size: 0.875rem;
          color: var(--text-secondary);
          line-height: 1.5;
          margin-bottom: 1rem;
        }
        .feature-link {
          color: var(--success);
          text-decoration: none;
          font-weight: 500;
          font-size: 0.875rem;
          transition: color 0.3s ease;
        }
        .feature-link:hover {
          color: var(--success);
          text-decoration: underline;
        }

        /* Nigeria Section */
        .nigeria-section {
          background: linear-gradient(135deg, var(--bg-card) 0%, var(--bg-secondary) 100%);
          border: 1px solid var(--border);
          border-radius: 16px;
          padding: 3rem;
          margin-bottom: 2rem;
        }
        .nigeria-content {
          text-align: center;
          max-width: 800px;
          margin: 0 auto;
        }
        .nigeria-badge {
          display: inline-block;
          background: var(--warning-dim);
          color: var(--warning);
          padding: 0.25rem 0.75rem;
          border-radius: 20px;
          font-size: 0.75rem;
          font-weight: 600;
          margin-bottom: 1rem;
        }
        .nigeria-content h2 {
          font-size: 1.75rem;
          font-weight: 700;
          margin-bottom: 1rem;
          color: var(--text-primary);
        }
        .nigeria-content p {
          font-size: 1rem;
          color: var(--text-secondary);
          line-height: 1.6;
          margin-bottom: 1.5rem;
        }
        .nigeria-features {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          gap: 1rem;
        }
        .nigeria-feature {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          background: var(--bg-tertiary);
          padding: 0.75rem 1rem;
          border-radius: 8px;
          font-size: 0.875rem;
          color: var(--text-secondary);
        }
        .nigeria-feature span:first-child {
          font-size: 1.25rem;
        }

        /* Responsive */
        @media (max-width: 768px) {
          .hero-section {
            padding: 1.5rem;
          }
          .hero-title {
            font-size: 1.75rem;
          }
          .hero-description {
            font-size: 1rem;
          }
          .hero-stats {
            flex-wrap: wrap;
            gap: 1rem;
          }
          .stat-divider {
            display: none;
          }
          .hero-actions {
            flex-direction: column;
          }
          .quick-actions-grid {
            flex-direction: column;
          }
          .quick-action-btn {
            justify-content: center;
          }
          .features-grid {
            grid-template-columns: 1fr;
          }
          .nigeria-features {
            grid-template-columns: 1fr 1fr;
          }
        }
        @media (max-width: 480px) {
          .nigeria-features {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}