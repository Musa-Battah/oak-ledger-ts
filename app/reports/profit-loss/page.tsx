import { getProfitLossReport } from '@/lib/data/reports';
import { formatNaira } from '@/lib/format-client';
import PeriodSelector from '@/components/PeriodSelector';
import PrintButton from '@/components/PrintButton';
import Link from 'next/link';

export const revalidate = 3600;

interface PageProps {
  searchParams: Promise<{ period?: string; startDate?: string; endDate?: string }>;
}

export default async function ProfitLossPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const period = params?.period || 'month';
  const startDate = params?.startDate;
  const endDate = params?.endDate;
  
  const report = await getProfitLossReport(period, startDate, endDate);
  
  const periodLabels: Record<string, string> = {
    all: 'All Time',
    today: 'Today',
    week: 'This Week',
    month: 'This Month',
    quarter: 'This Quarter',
    year: 'This Year',
    custom: 'Custom Range'
  };

  const getPeriodLabel = () => {
    if (period === 'custom' && startDate && endDate) {
      return `${new Date(startDate).toLocaleDateString()} - ${new Date(endDate).toLocaleDateString()}`;
    }
    return periodLabels[period] || period;
  };

  return (
    <div className="ifrs-report">
      {/* Report Header */}
      <div className="ifrs-header">
        <div className="ifrs-company-name">Oak Ledger</div>
        <div className="ifrs-report-title">Statement of Profit or Loss</div>
        <div className="ifrs-report-date">
          For the period: {getPeriodLabel()}
        </div>
        <div className="action-buttons" style={{ marginTop: '1rem', textAlign: 'center', display: 'flex', gap: '1rem', justifyContent: 'center' }}>
          <PeriodSelector currentPeriod={period} />
          <PrintButton />
          <Link href={`/api/reports/profit-loss/pdf?period=${period}${startDate ? `&startDate=${startDate}` : ''}${endDate ? `&endDate=${endDate}` : ''}`} target="_blank">
            <button className="btn-secondary">📄 Download PDF</button>
          </Link>
        </div>
      </div>

      {/* Revenue Section */}
      <div className="ifrs-section">
        <div className="ifrs-section-title">Revenue</div>
        {report.revenue.items.length === 0 ? (
          <div className="ifrs-row">
            <span className="ifrs-label">No revenue recorded</span>
            <span className="ifrs-amount">-</span>
          </div>
        ) : (
          <>
            {report.revenue.items.map((item) => (
              <div key={item.account_id} className="ifrs-row">
                <span className="ifrs-label">{item.account_name}</span>
                <span className="ifrs-amount ifrs-positive">
                  {formatNaira(item.amount)}
                </span>
              </div>
            ))}
            <div className="ifrs-row total">
              <span className="ifrs-label">Total Revenue</span>
              <span className="ifrs-amount ifrs-positive">
                {formatNaira(report.revenue.total)}
              </span>
            </div>
          </>
        )}
      </div>

      {/* Cost of Sales / Cost of Goods Sold */}
      {report.cogs && report.cogs.total > 0 && (
        <div className="ifrs-section">
          <div className="ifrs-section-title">Cost of Sales</div>
          {report.cogs.items.map((item) => (
            <div key={item.account_id} className="ifrs-row">
              <span className="ifrs-label">{item.account_name}</span>
              <span className="ifrs-amount ifrs-negative">
                {formatNaira(item.amount)}
              </span>
            </div>
          ))}
          <div className="ifrs-row total">
            <span className="ifrs-label">Total Cost of Sales</span>
            <span className="ifrs-amount ifrs-negative">
              {formatNaira(report.cogs.total)}
            </span>
          </div>
        </div>
      )}

      {/* Gross Profit */}
      {report.grossProfit !== undefined && (
        <div className="ifrs-row grand-total">
          <span className="ifrs-label">Gross Profit</span>
          <span className={`ifrs-amount ${report.grossProfit >= 0 ? 'ifrs-positive' : 'ifrs-negative'}`}>
            {formatNaira(report.grossProfit)}
          </span>
        </div>
      )}

      {/* Operating Expenses */}
      <div className="ifrs-section">
        <div className="ifrs-section-title">Operating Expenses</div>
        {report.expenses.items.length === 0 ? (
          <div className="ifrs-row">
            <span className="ifrs-label">No expenses recorded</span>
            <span className="ifrs-amount">-</span>
          </div>
        ) : (
          <>
            {report.expenses.items.map((item) => (
              <div key={item.account_id} className="ifrs-row">
                <span className="ifrs-label">{item.account_name}</span>
                <span className="ifrs-amount ifrs-negative">
                  {formatNaira(item.amount)}
                </span>
              </div>
            ))}
            <div className="ifrs-row total">
              <span className="ifrs-label">Total Operating Expenses</span>
              <span className="ifrs-amount ifrs-negative">
                {formatNaira(report.expenses.total)}
              </span>
            </div>
          </>
        )}
      </div>

      {/* Net Profit/Loss */}
      <div className="ifrs-row grand-total">
        <span className="ifrs-label">Profit / (Loss) for the Period</span>
        <span className={`ifrs-amount ${report.netIncome >= 0 ? 'ifrs-positive' : 'ifrs-negative'}`}>
          {formatNaira(report.netIncome)}
        </span>
      </div>

      {/* Notes to the Financial Statements */}
      <div className="ifrs-notes">
        <div className="ifrs-notes-title">Notes to the Financial Statements</div>
        <p>1. Revenue is recognized when goods are delivered or services are rendered.</p>
        <p>2. Expenses are recognized on an accrual basis.</p>
        <p>3. Figures are presented in Nigerian Naira (₦).</p>
        <p>4. This statement should be read in conjunction with the accompanying notes.</p>
      </div>
    </div>
  );
}