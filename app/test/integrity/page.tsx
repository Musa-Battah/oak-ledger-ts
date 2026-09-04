'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface TestResult {
  name: string;
  passed: boolean;
  details: string;
  data: any;
}

interface TestSummary {
  totalTests: number;
  passedTests: number;
  failedTests: number;
  allPassed: boolean;
  dataAvailability: {
    hasRevenueAccounts: boolean;
    hasExpenseAccounts: boolean;
    hasTransactions: boolean;
    hasJournalEntries: boolean;
  };
}

interface TestResponse {
  success: boolean;
  summary: TestSummary;
  results: TestResult[];
  recommendation: string;
  timestamp: string;
}

export default function IntegrityTestPage() {
  const [loading, setLoading] = useState(true);
  const [results, setResults] = useState<TestResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTestResults();
  }, []);

  const fetchTestResults = async () => {
    try {
      const res = await fetch('/api/test/integrity');
      const data = await res.json();
      if (data.success) {
        setResults(data);
      } else {
        setError(data.error || 'Failed to fetch test results');
      }
    } catch (err) {
      setError('Error fetching test results');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="container">
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <div className="spinner"></div>
          <p>Running integrity tests...</p>
          <style jsx>{`
            .spinner {
              width: 48px;
              height: 48px;
              border: 3px solid var(--border);
              border-top-color: var(--success);
              border-radius: 50%;
              animation: spin 1s linear infinite;
              margin: 0 auto 1rem;
            }
            @keyframes spin {
              to { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container">
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <h2>Error</h2>
          <p>{error}</p>
          <button className="btn-primary" onClick={fetchTestResults}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!results) {
    return (
      <div className="container">
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <p>No test results available</p>
        </div>
      </div>
    );
  }

  const { summary, results: testResults, recommendation } = results;

  return (
    <div className="container">
      <div className="page-header">
        <div className="page-title">
          <h1>Data Integrity Tests</h1>
          <p>Comprehensive testing of all financial data links</p>
        </div>
        <button className="btn-secondary" onClick={fetchTestResults}>
          🔄 Run Tests Again
        </button>
      </div>

      {/* Summary Cards */}
      <div className="stats-grid">
        <div className={`stat-card ${summary.allPassed ? 'passed' : 'failed'}`}>
          <div className="stat-title">Overall Status</div>
          <div className="stat-value">
            {summary.allPassed ? '✅ PASSED' : '❌ FAILED'}
          </div>
          <div className="stat-subtitle">{summary.passedTests} of {summary.totalTests} tests passed</div>
        </div>
        <div className="stat-card">
          <div className="stat-title">Passed Tests</div>
          <div className="stat-value" style={{ color: 'var(--success)' }}>{summary.passedTests}</div>
        </div>
        <div className="stat-card">
          <div className="stat-title">Failed Tests</div>
          <div className="stat-value" style={{ color: 'var(--danger)' }}>{summary.failedTests}</div>
        </div>
        <div className="stat-card">
          <div className="stat-title">Total Tests</div>
          <div className="stat-value">{summary.totalTests}</div>
        </div>
      </div>

      {/* Data Availability */}
      <div className="card">
        <h2>Data Availability</h2>
        <div className="availability-grid">
          <div className={`availability-item ${summary.dataAvailability.hasRevenueAccounts ? 'has' : 'missing'}`}>
            <span>Revenue Accounts</span>
            <span>{summary.dataAvailability.hasRevenueAccounts ? '✅' : '❌'}</span>
          </div>
          <div className={`availability-item ${summary.dataAvailability.hasExpenseAccounts ? 'has' : 'missing'}`}>
            <span>Expense Accounts</span>
            <span>{summary.dataAvailability.hasExpenseAccounts ? '✅' : '❌'}</span>
          </div>
          <div className={`availability-item ${summary.dataAvailability.hasTransactions ? 'has' : 'missing'}`}>
            <span>Transactions</span>
            <span>{summary.dataAvailability.hasTransactions ? '✅' : '❌'}</span>
          </div>
          <div className={`availability-item ${summary.dataAvailability.hasJournalEntries ? 'has' : 'missing'}`}>
            <span>Journal Entries</span>
            <span>{summary.dataAvailability.hasJournalEntries ? '✅' : '❌'}</span>
          </div>
        </div>
      </div>

      {/* Test Results */}
      <div className="card">
        <h2>Test Results</h2>
        <div className="table-container">
          <table className="test-table">
            <thead>
              <tr>
                <th>Test Name</th>
                <th>Status</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {testResults.map((test, index) => (
                <tr key={index} className={test.passed ? 'passed-row' : 'failed-row'}>
                  <td>{test.name}</td>
                  <td>
                    <span className={`badge ${test.passed ? 'badge-success' : 'badge-danger'}`}>
                      {test.passed ? '✅ Passed' : '❌ Failed'}
                    </span>
                  </td>
                  <td className="details-cell">{test.details}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recommendation */}
      <div className={`card recommendation ${summary.allPassed ? 'success' : 'warning'}`}>
        <h3>Recommendation</h3>
        <p>{recommendation}</p>
      </div>

      <style jsx>{`
        .stat-card.passed {
          border-color: var(--success);
        }
        .stat-card.failed {
          border-color: var(--danger);
        }
        .stat-subtitle {
          font-size: 0.8rem;
          color: var(--text-muted);
          margin-top: 0.5rem;
        }

        .availability-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1rem;
        }
        .availability-item {
          display: flex;
          justify-content: space-between;
          padding: 0.75rem 1rem;
          border-radius: 8px;
          background: var(--bg-secondary);
        }
        .availability-item.has {
          border-left: 3px solid var(--success);
        }
        .availability-item.missing {
          border-left: 3px solid var(--danger);
        }

        .test-table {
          width: 100%;
          border-collapse: collapse;
        }
        .test-table th,
        .test-table td {
          padding: 0.75rem;
          text-align: left;
          border-bottom: 1px solid var(--border);
        }
        .test-table th {
          background: var(--bg-tertiary);
          font-weight: 600;
          color: var(--text-muted);
        }
        .passed-row td {
          background: var(--success-dim);
        }
        .failed-row td {
          background: var(--danger-dim);
        }
        .details-cell {
          max-width: 400px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .recommendation {
          margin-top: 1.5rem;
        }
        .recommendation.success {
          border-left: 4px solid var(--success);
        }
        .recommendation.warning {
          border-left: 4px solid var(--warning);
        }
        .recommendation h3 {
          margin-bottom: 0.5rem;
        }
      `}</style>
    </div>
  );
}