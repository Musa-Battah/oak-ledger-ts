import { getTrialBalanceReport } from '@/lib/data/reports';
import { formatNaira } from '@/lib/format-client';
import PrintButton from '@/components/PrintButton';
import Link from 'next/link';

export const revalidate = 3600;

export default async function TrialBalancePage() {
  const report = await getTrialBalanceReport();

  return (
    <div className="ifrs-report">
      {/* Report Header */}
      <div className="ifrs-header">
        <div className="ifrs-company-name">Oak Ledger</div>
        <div className="ifrs-report-title">Trial Balance</div>
        <div className="ifrs-report-date">
          As at {new Date().toLocaleDateString('en-NG', { year: 'numeric', month: 'long', day: 'numeric' })}
        </div>
        <div style={{ marginTop: '1rem', textAlign: 'center', display: 'flex', gap: '1rem', justifyContent: 'center' }}>
          <PrintButton />
          <Link href="/api/reports/trial-balance/pdf" target="_blank">
            <button className="btn-secondary">📄 Download PDF</button>
          </Link>
        </div>
      </div>

      <div className="ifrs-trial-balance-container">
        <table className="ifrs-trial-balance">
          <thead>
            <tr>
              <th>Account Code</th>
              <th>Account Name</th>
              <th>Account Type</th>
              <th className="text-right">Debit (₦)</th>
              <th className="text-right">Credit (₦)</th>
            </tr>
          </thead>
          <tbody>
            {report.accounts.map((account) => (
              <tr key={account.account_id}>
                <td><code>{account.account_code}</code></td>
                <td>{account.account_name}</td>
                <td>{account.account_type}</td>
                <td className="text-right">
                  {account.debit > 0 ? formatNaira(account.debit) : '-'}
                </td>
                <td className="text-right">
                  {account.credit > 0 ? formatNaira(account.credit) : '-'}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="total-row">
              <td colSpan={3}><strong>Totals</strong></td>
              <td className="text-right"><strong>{formatNaira(report.totalDebits)}</strong></td>
              <td className="text-right"><strong>{formatNaira(report.totalCredits)}</strong></td>
            </tr>
          </tfoot>
        </table>

        {report.isBalanced ? (
          <div className="ifrs-notes" style={{ marginTop: '1rem', textAlign: 'center', background: '#e8f5e9' }}>
            ✓ The trial balance is balanced. Total Debits equal Total Credits.
          </div>
        ) : (
          <div className="ifrs-notes" style={{ marginTop: '1rem', textAlign: 'center', background: '#ffebee' }}>
            ✗ The trial balance is NOT balanced. Difference: {formatNaira(Math.abs(report.totalDebits - report.totalCredits))}
          </div>
        )}
      </div>

      {/* Notes */}
      <div className="ifrs-notes">
        <div className="ifrs-notes-title">Notes</div>
        <p>1. A trial balance verifies the arithmetical accuracy of the ledger accounts.</p>
        <p>2. Debits should equal Credits in a properly balanced system.</p>
        <p>3. Figures are presented in Nigerian Naira (₦).</p>
      </div>
    </div>
  );
}