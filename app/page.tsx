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
      title: 'Invoicing',
      description: 'Create and manage professional invoices for your customers',
      link: '/sales/invoices/new',
      linkText: 'Create Invoice'
    },
    {
      title: 'Payment Tracking',
      description: 'Record customer payments and track outstanding balances',
      link: '/sales/invoices',
      linkText: 'View Invoices'
    },
    {
      title: 'Financial Reports',
      description: 'Generate IFRS-compliant financial statements instantly',
      link: '/reports/profit-loss',
      linkText: 'View Reports'
    },
    {
      title: 'VAT Management',
      description: 'Track and report Nigerian VAT with FIRS-compliant reports',
      link: '/reports/tax',
      linkText: 'View VAT Report'
    },
    {
      title: 'Customer Management',
      description: 'Maintain a complete customer database with transaction history',
      link: '/sales/customers',
      linkText: 'Manage Customers'
    },
    {
      title: 'Product Catalog',
      description: 'Manage your products and services with pricing and inventory',
      link: '/sales/products',
      linkText: 'View Products'
    }
  ];

  const quickActions = [
    { label: 'New Invoice', href: '/sales/invoices/new', color: 'primary' },
    { label: 'New Bill', href: '/purchases/bills/new', color: 'secondary' },
    { label: 'Dashboard', href: '/dashboard', color: 'info' },
    { label: 'Reports', href: '/reports/profit-loss', color: 'success' }
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
            min-height: 100vh;
            gap: 1rem;
            background: var(--bg-primary);
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
      {/* Hero Section with Full Page Background Image - Stretched */}
      <div className="hero-section">
        <div className="hero-overlay"></div>
        <div className="hero-content-wrapper">
          <div className="hero-content">
            <div className="hero-badge">Double-Entry Accounting</div>
            <h1 className="hero-title">
              Professional Accounting for <span className="highlight">Nigerian Businesses</span>
            </h1>
            <p className="hero-description">
              Manage invoices, track payments, generate IFRS-compliant reports, 
              and stay compliant with Nigerian tax regulations all in one place.
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
      </div>

      {/* Quick Actions */}
      <div className="quick-actions">
        <h2>Quick Actions</h2>
        <div className="quick-actions-grid">
          {quickActions.map((action, index) => (
            <Link key={index} href={action.href}>
              <button className={`quick-action-btn ${action.color}`}>
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
              <h3>{feature.title}</h3>
              <p>{feature.description}</p>
              <Link href={feature.link} className="feature-link">
                {feature.linkText} →
              </Link>
            </div>
          ))}
        </div>
      </div>

      {/* Nigerian Focus Section */}
      <div className="nigeria-section">
        <div className="nigeria-content">
          <div className="nigeria-badge">Nigerian Focus</div>
          <h2>Built for Nigerian Businesses</h2>
          <p>
            Oak Ledger is designed specifically for the Nigerian business environment 
            with support for Naira, 7.5% VAT, FIRS-compliant reporting, 
            and IFRS financial statements.
          </p>
          <div className="nigeria-features">
            <div className="nigeria-feature">
              <span>Naira Currency Support</span>
            </div>
            <div className="nigeria-feature">
              <span>7.5% VAT Calculation</span>
            </div>
            <div className="nigeria-feature">
              <span>FIRS-Compliant Reports</span>
            </div>
            <div className="nigeria-feature">
              <span>IFRS Financial Statements</span>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .home-container {
          padding: 0;
          min-height: 100vh;
        }

        /* Hero Section with Full Page Background Image - Stretched */
        .hero-section {
          position: relative;
          min-height: 100vh;
          width: 100%;
          background-image: url('/assets/Moonlight.jpg');
          background-size: cover;
          background-position: center;
          background-repeat: no-repeat;
          display: flex;
          align-items: center;
          padding: 4rem 2rem;
          margin-bottom: 2rem;
          /* Force image to cover the entire area */
          background-attachment: scroll;
        }
        .hero-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.7);
          z-index: 0;
        }
        .hero-content-wrapper {
          position: relative;
          z-index: 1;
          max-width: 1200px;
          width: 100%;
          margin: 0 auto;
        }
        .hero-content {
          max-width: 600px;
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
          font-size: 3rem;
          font-weight: 700;
          line-height: 1.2;
          margin-bottom: 1rem;
          color: #ffffff;
        }
        .hero-title .highlight {
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .hero-description {
          font-size: 1.125rem;
          color: rgba(255, 255, 255, 0.85);
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
          margin-top: 3rem;
          padding-top: 2rem;
          border-top: 1px solid rgba(255, 255, 255, 0.1);
        }
        .stat-item {
          display: flex;
          flex-direction: column;
        }
        .stat-number {
          font-size: 1.5rem;
          font-weight: 700;
          color: #ffffff;
        }
        .stat-label {
          font-size: 0.75rem;
          color: rgba(255, 255, 255, 0.6);
        }
        .stat-divider {
          width: 1px;
          height: 40px;
          background: rgba(255, 255, 255, 0.1);
        }

        /* Quick Actions */
        .quick-actions {
          max-width: 1200px;
          margin: 0 auto 2rem;
          padding: 0 2rem;
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
          max-width: 1200px;
          margin: 0 auto 2rem;
          padding: 0 2rem;
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
          max-width: 1200px;
          margin: 0 auto 2rem;
          padding: 0 2rem;
        }
        .nigeria-content {
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: 16px;
          padding: 3rem;
          text-align: center;
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
          background: var(--bg-tertiary);
          padding: 0.75rem 1rem;
          border-radius: 8px;
          font-size: 0.875rem;
          color: var(--text-secondary);
        }

        /* Responsive */
        @media (max-width: 768px) {
          .hero-section {
            min-height: 80vh;
            padding: 2rem 1rem;
          }
          .hero-title {
            font-size: 2rem;
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
          .quick-actions {
            padding: 0 1rem;
          }
          .quick-actions-grid {
            flex-direction: column;
          }
          .quick-action-btn {
            justify-content: center;
          }
          .features-section {
            padding: 0 1rem;
          }
          .features-grid {
            grid-template-columns: 1fr;
          }
          .nigeria-section {
            padding: 0 1rem;
          }
          .nigeria-content {
            padding: 1.5rem;
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