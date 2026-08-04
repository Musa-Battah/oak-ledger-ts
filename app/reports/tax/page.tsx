'use client';

import { useEffect, useState } from 'react';
import { formatNaira } from '@/lib/format-client';

interface VATReport {
  period: string;
  outputVAT: number;
  inputVAT: number;
  vatPayable: number;
  sales: Array<{
    invoice_number: string;
    customer_name: string;
    date: string;
    subtotal: number;
    vat_amount: number;
    total: number;
  }>;
  purchases: Array<{
    bill_number: string;
    supplier_name: string;
    date: string;
    subtotal: number;
    vat_amount: number;
    total: number;
  }>;
}

const periodLabels: Record<string, string> = {
  all: 'All Time',
  month: 'This Month',
  quarter: 'This Quarter',
  year: 'This Year'
};

export default function TaxReportPage() {
  const [report, setReport] = useState<VATReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('month');

  useEffect(() => {
    fetchReport();
  }, [period]);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/reports/vat?period=${period}`);
      const data = await res.json();
      if (data.success) {
        setReport(data.data);
      }
    } catch (error) {
      console.error('Error fetching VAT report:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportToExcel = () => {
    window.open(`/api/reports/vat?period=${period}&format=excel`, '_blank');
  };

  if (loading) {
    return (
      <div className="container">
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <p>Loading VAT report...</p>
        </div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="container">
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <p>No VAT data available</p>
        </div>
      </div>
    );
  }

  const vatRate = 7.5;
  const isPayable = report.vatPayable > 0;

  return (
    <div className="container">
      <div className="page-header">
        <div className="page-title">
          <h1>VAT Report (FIRS Compliant)</h1>
          <p>Value Added Tax report for {report.period}</p>
        </div>
        <div className="action-buttons">
          <select 
            className="btn-secondary" 
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
          >
            <option value="all">All Time</option>
            <option value="month">This Month</option>
            <option value="quarter">This Quarter</option>
            <option value="year">This Year</option>
          </select>
          <button className="btn-primary" onClick={exportToExcel}>
            📊 Export to Excel
          </button>
        </div>
      </div>

      {/* VAT Summary Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-title">Output VAT (Sales)</div>
          <div className="stat-value">{formatNaira(report.outputVAT)}</div>
          <div className="stat-subtitle">7.5% of taxable sales</div>
        </div>
        <div className="stat-card">
          <div className="stat-title">Input VAT (Purchases)</div>
          <div className="stat-value">{formatNaira(report.inputVAT)}</div>
          <div className="stat-subtitle">7.5% of taxable purchases</div>
        </div>
        <div className="stat-card">
          <div className="stat-title">VAT Payable</div>
          <div className={`stat-value ${isPayable ? 'text-danger' : 'text-success'}`}>
            {formatNaira(Math.abs(report.vatPayable))}
          </div>
          <div className="stat-subtitle">
            {isPayable ? 'Amount due to FIRS' : 'Excess credit to carry forward'}
          </div>
        </div>
      </div>

      {/* VAT Calculation Summary */}
      <div className="card">
        <h2>VAT Calculation Summary</h2>
        <div className="vat-summary">
          <div className="summary-row">
            <span>Total Taxable Sales (Excluding VAT)</span>
            <span>{formatNaira(report.sales.reduce((sum, s) => sum + s.subtotal, 0))}</span>
          </div>
          <div className="summary-row">
            <span>VAT Rate</span>
            <span>{vatRate}%</span>
          </div>
          <div className="summary-row">
            <span>Output VAT (7.5% of Sales)</span>
            <span className="text-primary">{formatNaira(report.outputVAT)}</span>
          </div>
          <div className="summary-divider"></div>
          <div className="summary-row">
            <span>Total Taxable Purchases (Excluding VAT)</span>
            <span>{formatNaira(report.purchases.reduce((sum, p) => sum + p.subtotal, 0))}</span>
          </div>
          <div className="summary-row">
            <span>Input VAT (7.5% of Purchases)</span>
            <span className="text-primary">{formatNaira(report.inputVAT)}</span>
          </div>
          <div className="summary-divider"></div>
          <div className="summary-row total">
            <span>Net VAT Payable / (Refundable)</span>
            <span className={isPayable ? 'text-danger' : 'text-success'}>
              {formatNaira(report.vatPayable)}
            </span>
          </div>
        </div>
      </div>

      {/* Sales Details */}
      <div className="card">
        <h2>Sales (Output VAT)</h2>
        {report.sales.length === 0 ? (
          <p className="no-data">No sales recorded for this period</p>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Invoice #</th>
                  <th>Customer</th>
                  <th>Date</th>
                  <th>Subtotal</th>
                  <th>VAT (7.5%)</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {report.sales.map((sale, idx) => (
                  <tr key={idx}>
                    <td>{sale.invoice_number}</td>
                    <td>{sale.customer_name}</td>
                    <td>{new Date(sale.date).toLocaleDateString()}</td>
                    <td>{formatNaira(sale.subtotal)}</td>
                    <td>{formatNaira(sale.vat_amount)}</td>
                    <td>{formatNaira(sale.total)}</td>
                  </tr>
                ))}
                <tr className="total-row">
                  <td colSpan={3}><strong>Totals</strong></td>
                  <td><strong>{formatNaira(report.sales.reduce((sum, s) => sum + s.subtotal, 0))}</strong></td>
                  <td><strong>{formatNaira(report.outputVAT)}</strong></td>
                  <td><strong>{formatNaira(report.sales.reduce((sum, s) => sum + s.total, 0))}</strong></td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Purchase Details */}
      <div className="card">
        <h2>Purchases (Input VAT)</h2>
        {report.purchases.length === 0 ? (
          <p className="no-data">No purchases recorded for this period</p>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Bill #</th>
                  <th>Supplier</th>
                  <th>Date</th>
                  <th>Subtotal</th>
                  <th>VAT (7.5%)</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {report.purchases.map((purchase, idx) => (
                  <tr key={idx}>
                    <td>{purchase.bill_number}</td>
                    <td>{purchase.supplier_name}</td>
                    <td>{new Date(purchase.date).toLocaleDateString()}</td>
                    <td>{formatNaira(purchase.subtotal)}</td>
                    <td>{formatNaira(purchase.vat_amount)}</td>
                    <td>{formatNaira(purchase.total)}</td>
                  </tr>
                ))}
                <tr className="total-row">
                  <td colSpan={3}><strong>Totals</strong></td>
                  <td><strong>{formatNaira(report.purchases.reduce((sum, p) => sum + p.subtotal, 0))}</strong></td>
                  <td><strong>{formatNaira(report.inputVAT)}</strong></td>
                  <td><strong>{formatNaira(report.purchases.reduce((sum, p) => sum + p.total, 0))}</strong></td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* FIRS Filing Information */}
      <div className="card info-card">
        <h3>📋 FIRS Filing Information</h3>
        <div className="info-content">
          <p><strong>Due Date:</strong> 21st of the following month</p>
          <p><strong>Penalty for Late Filing:</strong> ₦50,000 for first month + ₦25,000 for subsequent months</p>
          <p><strong>Late Payment Interest:</strong> 15% per annum</p>
          <p><strong>VAT Rate:</strong> 7.5% (effective from February 1, 2020)</p>
        </div>
      </div>

      <style jsx>{`
        .stat-subtitle {
          font-size: 0.7rem;
          color: var(--text-muted);
          margin-top: 0.5rem;
        }
        
        .vat-summary {
          max-width: 500px;
          margin: 0 auto;
        }
        
        .summary-row {
          display: flex;
          justify-content: space-between;
          padding: 0.75rem 0;
          font-size: 0.875rem;
        }
        
        .summary-row.total {
          font-weight: 700;
          font-size: 1rem;
          padding-top: 1rem;
        }
        
        .summary-divider {
          height: 1px;
          background: var(--border);
          margin: 0.5rem 0;
        }
        
        .total-row {
          background: var(--bg-tertiary);
          font-weight: 600;
        }
        
        .total-row td {
          padding: 0.75rem;
        }
        
        .text-primary {
          color: var(--success);
        }
        
        .text-danger {
          color: var(--danger);
        }
        
        .text-success {
          color: var(--success);
        }
        
        .no-data {
          text-align: center;
          padding: 2rem;
          color: var(--text-muted);
        }
        
        .info-card {
          background: var(--info-dim);
          border-left: 3px solid var(--info);
        }
        
        .info-content p {
          margin: 0.5rem 0;
          font-size: 0.875rem;
          color: var(--text-secondary);
        }
        
        .info-content strong {
          color: var(--text-primary);
        }
      `}</style>
    </div>
  );
}