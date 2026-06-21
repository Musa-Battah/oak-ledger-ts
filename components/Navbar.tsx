'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

type DropdownMenu = 'sales' | 'purchases' | 'reports' | 'accounting' | null;

export default function Navbar(): React.ReactElement {
  const { user, logout } = useAuth();
  const [openDropdown, setOpenDropdown] = useState<DropdownMenu>(null);
  const [isMenuOpen, setIsMenuOpen] = useState<boolean>(false);
  const pathname = usePathname();

  const toggleDropdown = (menu: DropdownMenu): void => {
    setOpenDropdown(openDropdown === menu ? null : menu);
  };

  const closeDropdown = (): void => {
    setOpenDropdown(null);
    setIsMenuOpen(false);
  };

  const isActive = (path: string): boolean => pathname === path;

  const handleLogout = async () => {
    await logout();
    window.location.href = '/';
  };

  return (
    <nav className="navbar">
      <div className="nav-container">
        <Link href="/" className="logo" onClick={closeDropdown}>
          🌳 <span>Oak</span> Ledger
        </Link>
        
        <button 
          className="mobile-menu-btn" 
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          aria-label="Toggle menu"
        >
          ☰
        </button>
        
        <div className={`nav-links ${isMenuOpen ? 'active' : ''}`}>
          <Link 
            href="/dashboard" 
            className={`nav-link ${isActive('/dashboard') ? 'active' : ''}`} 
            onClick={closeDropdown}
          >
            Dashboard
          </Link>
          
          {/* Sales Dropdown */}
          <div className="dropdown dropdown-left">
            <button 
              className={`dropdown-toggle ${openDropdown === 'sales' ? 'active' : ''}`}
              onClick={() => toggleDropdown('sales')}
            >
              Sales ▼
            </button>
            {openDropdown === 'sales' && (
              <div className="dropdown-menu">
                <Link href="/sales/overview" className="dropdown-item" onClick={closeDropdown}>
                  Overview
                </Link>
                <Link href="/sales/invoices" className="dropdown-item" onClick={closeDropdown}>
                  Invoices
                </Link>
                <Link href="/sales/invoices/new" className="dropdown-item" onClick={closeDropdown}>
                  New Invoice
                </Link>
                <div className="dropdown-divider"></div>
                <Link href="/sales/products" className="dropdown-item" onClick={closeDropdown}>
                  Products & Services
                </Link>
                <Link href="/sales/customers" className="dropdown-item" onClick={closeDropdown}>
                  Customers
                </Link>
                <div className="dropdown-divider"></div>
                <Link href="/sales/settings" className="dropdown-item" onClick={closeDropdown}>
                  Sales Settings
                </Link>
              </div>
            )}
          </div>
          
          {/* Purchases Dropdown */}
          <div className="dropdown dropdown-left">
            <button 
              className={`dropdown-toggle ${openDropdown === 'purchases' ? 'active' : ''}`}
              onClick={() => toggleDropdown('purchases')}
            >
              Purchases ▼
            </button>
            {openDropdown === 'purchases' && (
              <div className="dropdown-menu">
                <Link href="/purchases/overview" className="dropdown-item" onClick={closeDropdown}>
                  Overview
                </Link>
                <Link href="/purchases/bills" className="dropdown-item" onClick={closeDropdown}>
                  Bills
                </Link>
                <Link href="/purchases/bills/new" className="dropdown-item" onClick={closeDropdown}>
                  New Bill
                </Link>
                <div className="dropdown-divider"></div>
                <Link href="/purchases/expenses" className="dropdown-item" onClick={closeDropdown}>
                  Expenses
                </Link>
                <Link href="/purchases/suppliers" className="dropdown-item" onClick={closeDropdown}>
                  Suppliers
                </Link>
                <div className="dropdown-divider"></div>
                <Link href="/purchases/settings" className="dropdown-item" onClick={closeDropdown}>
                  Purchases Settings
                </Link>
              </div>
            )}
          </div>
          
          {/* Reports Dropdown */}
          <div className="dropdown dropdown-right">
            <button 
              className={`dropdown-toggle ${openDropdown === 'reports' ? 'active' : ''}`}
              onClick={() => toggleDropdown('reports')}
            >
              Reports ▼
            </button>
            {openDropdown === 'reports' && (
              <div className="dropdown-menu">
                <Link href="/reports/profit-loss" className="dropdown-item" onClick={closeDropdown}>
                  Profit & Loss
                </Link>
                <Link href="/reports/balance-sheet" className="dropdown-item" onClick={closeDropdown}>
                  Balance Sheet
                </Link>
                <Link href="/reports/trial-balance" className="dropdown-item" onClick={closeDropdown}>
                  Trial Balance
                </Link>
                <div className="dropdown-divider"></div>
                <Link href="/reports/tax" className="dropdown-item" onClick={closeDropdown}>
                  VAT Report
                </Link>
                <div className="dropdown-divider"></div>
                <Link href="/audit-logs" className="dropdown-item" onClick={closeDropdown}>
                  Audit Log
                </Link>
              </div>
            )}
          </div>
          
          {/* Accounting Dropdown */}
          <div className="dropdown dropdown-right">
            <button 
              className={`dropdown-toggle ${openDropdown === 'accounting' ? 'active' : ''}`}
              onClick={() => toggleDropdown('accounting')}
            >
              Accounting ▼
            </button>
            {openDropdown === 'accounting' && (
              <div className="dropdown-menu">
                <Link href="/accounts" className="dropdown-item" onClick={closeDropdown}>
                  Chart of Accounts
                </Link>
                <Link href="/journal" className="dropdown-item" onClick={closeDropdown}>
                  Journal Entries
                </Link>
                <div className="dropdown-divider"></div>
                <Link href="/settings/accounting" className="dropdown-item" onClick={closeDropdown}>
                  Accounting Settings
                </Link>
              </div>
            )}
          </div>
          
          {/* User Section */}
          {user ? (
            <div className="user-section">
              <span className="user-name">{user.name}</span>
              <span className="user-role">{user.role}</span>
              <button onClick={handleLogout} className="logout-btn">
                Sign out
              </button>
            </div>
          ) : (
            <div className="auth-links">
              <Link href="/login" className="nav-link" onClick={closeDropdown}>
                Sign in
              </Link>
              <Link href="/register" className="nav-link" onClick={closeDropdown}>
                Create account
              </Link>
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        .user-section {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }
        .user-name {
          color: var(--text-primary);
          font-weight: 500;
          font-size: 0.875rem;
        }
        .user-role {
          color: var(--text-muted);
          font-size: 0.75rem;
          background: var(--bg-tertiary);
          padding: 0.15rem 0.5rem;
          border-radius: 12px;
          text-transform: uppercase;
        }
        .logout-btn {
          background: none;
          border: none;
          cursor: pointer;
          font-size: 0.875rem;
          padding: 0.5rem 1rem;
          color: var(--text-secondary);
          transition: all 0.2s ease;
          border-radius: 6px;
        }
        .logout-btn:hover {
          color: #ef4444;
          background-color: var(--danger-dim);
        }
        .auth-links {
          display: flex;
          gap: 1rem;
          align-items: center;
        }
        @media (max-width: 768px) {
          .user-section {
            flex-wrap: wrap;
            gap: 0.5rem;
          }
        }
      `}</style>
    </nav>
  );
}