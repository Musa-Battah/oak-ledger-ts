import { getBalanceSheetReport } from '@/lib/data/reports';
import { formatNaira } from '@/lib/format-client';
import PrintButton from '@/components/PrintButton';
import Link from 'next/link';

export const revalidate = 3600;

export default async function BalanceSheetPage() {
  const report = await getBalanceSheetReport();
  const totalLiabilitiesEquity = report.liabilities.total + report.equity.total;
  const isBalanced = Math.abs(report.assets.total - totalLiabilitiesEquity) < 0.01;

  return (
    <div className="ifrs-report">
      {/* Report Header */}
      <div className="ifrs-header">
        <div className="ifrs-company-name">Oak Ledger</div>
        <div className="ifrs-report-title">Statement of Financial Position</div>
        <div className="ifrs-report-date">
          As at {new Date().toLocaleDateString('en-NG', { year: 'numeric', month: 'long', day: 'numeric' })}
        </div>
        <div style={{ marginTop: '1rem', textAlign: 'center', display: 'flex', gap: '1rem', justifyContent: 'center' }}>
          <PrintButton />
          <Link href="/api/reports/balance-sheet/pdf" target="_blank">
            <button className="btn-secondary">📄 Download PDF</button>
          </Link>
        </div>
      </div>

      <div className="ifrs-balance-grid">
        {/* ASSETS Column */}
        <div className="ifrs-balance-col">
          <div className="ifrs-section-title">ASSETS</div>
          
          {/* Non-Current Assets */}
          <div className="ifrs-subsection-title">Non-Current Assets</div>
          {report.assets.fixed.items.length === 0 ? (
            <div className="ifrs-row">
              <span className="ifrs-label">No non-current assets</span>
              <span className="ifrs-amount">-</span>
            </div>
          ) : (
            <>
              {report.assets.fixed.items.map((item) => (
                <div key={item.account_id} className="ifrs-row">
                  <span className="ifrs-label">{item.account_name}</span>
                  <span className="ifrs-amount">{formatNaira(item.balance)}</span>
                </div>
              ))}
              <div className="ifrs-row total">
                <span className="ifrs-label">Total Non-Current Assets</span>
                <span className="ifrs-amount">{formatNaira(report.assets.fixed.total)}</span>
              </div>
            </>
          )}

          {/* Current Assets */}
          <div className="ifrs-subsection-title" style={{ marginTop: '1rem' }}>Current Assets</div>
          {report.assets.current.items.length === 0 ? (
            <div className="ifrs-row">
              <span className="ifrs-label">No current assets</span>
              <span className="ifrs-amount">-</span>
            </div>
          ) : (
            <>
              {report.assets.current.items.map((item) => (
                <div key={item.account_id} className="ifrs-row">
                  <span className="ifrs-label">{item.account_name}</span>
                  <span className="ifrs-amount">{formatNaira(item.balance)}</span>
                </div>
              ))}
              <div className="ifrs-row total">
                <span className="ifrs-label">Total Current Assets</span>
                <span className="ifrs-amount">{formatNaira(report.assets.current.total)}</span>
              </div>
            </>
          )}

          {/* TOTAL ASSETS */}
          <div className="ifrs-row grand-total">
            <span className="ifrs-label">TOTAL ASSETS</span>
            <span className="ifrs-amount">{formatNaira(report.assets.total)}</span>
          </div>
        </div>

        {/* EQUITY AND LIABILITIES Column */}
        <div className="ifrs-balance-col">
          <div className="ifrs-section-title">EQUITY AND LIABILITIES</div>
          
          {/* Equity */}
          <div className="ifrs-subsection-title">Equity</div>
          {report.equity.items.length === 0 ? (
            <div className="ifrs-row">
              <span className="ifrs-label">No equity accounts</span>
              <span className="ifrs-amount">-</span>
            </div>
          ) : (
            <>
              {report.equity.items.map((item) => (
                <div key={item.account_id} className="ifrs-row">
                  <span className="ifrs-label">{item.account_name}</span>
                  <span className="ifrs-amount">{formatNaira(item.balance)}</span>
                </div>
              ))}
              <div className="ifrs-row total">
                <span className="ifrs-label">Total Equity</span>
                <span className="ifrs-amount">{formatNaira(report.equity.total)}</span>
              </div>
            </>
          )}

          {/* Non-Current Liabilities */}
          <div className="ifrs-subsection-title" style={{ marginTop: '1rem' }}>Non-Current Liabilities</div>
          {report.liabilities.longTerm.items.length === 0 ? (
            <div className="ifrs-row">
              <span className="ifrs-label">No non-current liabilities</span>
              <span className="ifrs-amount">-</span>
            </div>
          ) : (
            <>
              {report.liabilities.longTerm.items.map((item) => (
                <div key={item.account_id} className="ifrs-row">
                  <span className="ifrs-label">{item.account_name}</span>
                  <span className="ifrs-amount">{formatNaira(item.balance)}</span>
                </div>
              ))}
              <div className="ifrs-row total">
                <span className="ifrs-label">Total Non-Current Liabilities</span>
                <span className="ifrs-amount">{formatNaira(report.liabilities.longTerm.total)}</span>
              </div>
            </>
          )}

          {/* Current Liabilities */}
          <div className="ifrs-subsection-title" style={{ marginTop: '1rem' }}>Current Liabilities</div>
          {report.liabilities.current.items.length === 0 ? (
            <div className="ifrs-row">
              <span className="ifrs-label">No current liabilities</span>
              <span className="ifrs-amount">-</span>
            </div>
          ) : (
            <>
              {report.liabilities.current.items.map((item) => (
                <div key={item.account_id} className="ifrs-row">
                  <span className="ifrs-label">{item.account_name}</span>
                  <span className="ifrs-amount">{formatNaira(item.balance)}</span>
                </div>
              ))}
              <div className="ifrs-row total">
                <span className="ifrs-label">Total Current Liabilities</span>
                <span className="ifrs-amount">{formatNaira(report.liabilities.current.total)}</span>
              </div>
            </>
          )}

          {/* TOTAL LIABILITIES */}
          <div className="ifrs-row total">
            <span className="ifrs-label">Total Liabilities</span>
            <span className="ifrs-amount">{formatNaira(report.liabilities.total)}</span>
          </div>

          {/* TOTAL EQUITY AND LIABILITIES */}
          <div className="ifrs-row grand-total">
            <span className="ifrs-label">TOTAL EQUITY AND LIABILITIES</span>
            <span className="ifrs-amount">{formatNaira(totalLiabilitiesEquity)}</span>
          </div>

          {isBalanced && (
            <div className="ifrs-notes" style={{ marginTop: '1rem', textAlign: 'center' }}>
              ✓ The accounting equation (Assets = Equity + Liabilities) is balanced
            </div>
          )}
        </div>
      </div>

      {/* Notes to the Financial Statements */}
      <div className="ifrs-notes">
        <div className="ifrs-notes-title">Notes to the Financial Statements</div>
        <p>1. These financial statements have been prepared in accordance with IFRS standards.</p>
        <p>2. Assets and liabilities are classified as current/non-current based on a 12-month operating cycle.</p>
        <p>3. Figures are presented in Nigerian Naira (₦).</p>
        <p>4. This statement should be read in conjunction with the accompanying notes.</p>
      </div>
    </div>
  );
}