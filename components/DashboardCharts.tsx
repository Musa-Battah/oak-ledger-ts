'use client';

import { useEffect, useState } from 'react';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  AreaChart, Area
} from 'recharts';

interface ChartData {
  monthlyRevenue: Array<{ month: string; amount: number }>;
  expenseBreakdown: Array<{ name: string; value: number }>;
  topCustomers: Array<{ name: string; amount: number }>;
  agingData: Array<{ range: string; amount: number }>;
}

const formatNaira = (value: number): string => {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

// Custom Tooltips with proper typing (using any to avoid complex type issues)
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="chart-tooltip">
        <div className="tooltip-title">{label}</div>
        <div className="tooltip-value">{formatNaira(payload[0]?.value || 0)}</div>
      </div>
    );
  }
  return null;
};

const CustomPieTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0]?.payload;
    return (
      <div className="chart-tooltip">
        <div className="tooltip-title">{data?.name || ''}</div>
        <div className="tooltip-value">{formatNaira(data?.value || 0)}</div>
        <div className="tooltip-percentage">{(data?.percent * 100).toFixed(1)}% of total</div>
      </div>
    );
  }
  return null;
};

export default function DashboardCharts() {
  const [data, setData] = useState<ChartData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchChartData();
  }, []);

  const fetchChartData = async () => {
    try {
      const res = await fetch('/api/dashboard/charts');
      const result = await res.json();
      if (result.success && result.data) {
        setData(result.data);
      } else {
        setData({
          monthlyRevenue: [],
          expenseBreakdown: [],
          topCustomers: [],
          agingData: [{ range: 'Outstanding', amount: 0 }]
        });
      }
    } catch (err) {
      console.error('Error fetching chart data:', err);
      setData({
        monthlyRevenue: [],
        expenseBreakdown: [],
        topCustomers: [],
        agingData: [{ range: 'Outstanding', amount: 0 }]
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="charts-loading">
        <div className="spinner"></div>
        <p>Loading charts...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="charts-empty">
        <p>📊 No chart data available</p>
      </div>
    );
  }

  const hasRevenue = data.monthlyRevenue && data.monthlyRevenue.length > 0 && data.monthlyRevenue.some(r => r.amount > 0);
  const hasExpenses = data.expenseBreakdown && data.expenseBreakdown.length > 0 && data.expenseBreakdown.some(e => e.value > 0);
  const hasCustomers = data.topCustomers && data.topCustomers.length > 0 && data.topCustomers.some(c => c.amount > 0);
  const hasAging = data.agingData && data.agingData.length > 0 && data.agingData[0].amount > 0;

  const CHART_COLORS = {
    pie: ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec489a', '#06b6d4', '#84cc16']
  };

  const renderPieLabel = (entry: any) => {
    return `${entry.name}`;
  };

  return (
    <div className="dashboard-charts">
      {/* Revenue Trend Chart */}
      {hasRevenue && (
        <div className="chart-card">
          <div className="chart-header">
            <div>
              <h3>Revenue Trend</h3>
              <p className="chart-subtitle">Monthly revenue performance</p>
            </div>
            <div className="chart-badge">
              <span className="badge-dot revenue"></span>
              <span>Revenue</span>
            </div>
          </div>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={data.monthlyRevenue} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.05}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" vertical={false} />
                <XAxis 
                  dataKey="month" 
                  stroke="#6b6b6b" 
                  tick={{ fill: '#a0a0a0', fontSize: 11 }}
                  tickLine={false}
                  axisLine={{ stroke: '#2a2a2a' }}
                />
                <YAxis 
                  stroke="#6b6b6b" 
                  tick={{ fill: '#a0a0a0', fontSize: 11 }}
                  tickFormatter={(v) => `₦${(v as number)/1000}k`}
                  tickLine={false}
                  axisLine={{ stroke: '#2a2a2a' }}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#10b981', strokeWidth: 1 }} />
                <Area 
                  type="monotone" 
                  dataKey="amount" 
                  stroke="#10b981" 
                  strokeWidth={2.5}
                  fill="url(#revenueGradient)"
                  name="Revenue"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Expense Breakdown Pie Chart */}
      {hasExpenses && (
        <div className="chart-card">
          <div className="chart-header">
            <div>
              <h3>Expense Breakdown</h3>
              <p className="chart-subtitle">Top expense categories</p>
            </div>
          </div>
          <div className="chart-container pie-container">
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={data.expenseBreakdown}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={renderPieLabel}
                  outerRadius={90}
                  innerRadius={45}
                  paddingAngle={2}
                  dataKey="value"
                  nameKey="name"
                >
                  {data.expenseBreakdown.map((_, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={CHART_COLORS.pie[index % CHART_COLORS.pie.length]}
                      stroke="#0d0d0d"
                      strokeWidth={2}
                    />
                  ))}
                </Pie>
                <Tooltip content={<CustomPieTooltip />} />
                <Legend 
                  verticalAlign="bottom" 
                  height={36}
                  formatter={(value) => <span style={{ color: '#a0a0a0', fontSize: 11 }}>{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Top Customers Bar Chart */}
      {hasCustomers && (
        <div className="chart-card">
          <div className="chart-header">
            <div>
              <h3>Top Customers</h3>
              <p className="chart-subtitle">Highest paying customers</p>
            </div>
          </div>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={data.topCustomers} layout="vertical" margin={{ left: 100 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" horizontal={false} />
                <XAxis 
                  type="number" 
                  stroke="#6b6b6b" 
                  tick={{ fill: '#a0a0a0', fontSize: 11 }}
                  tickFormatter={(v) => `₦${(v as number)/1000}k`}
                  axisLine={{ stroke: '#2a2a2a' }}
                />
                <YAxis 
                  type="category" 
                  dataKey="name" 
                  stroke="#6b6b6b" 
                  tick={{ fill: '#a0a0a0', fontSize: 11 }}
                  width={100}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: '#10b981', fillOpacity: 0.1 }} />
                <Bar 
                  dataKey="amount" 
                  fill="#3b82f6" 
                  radius={[0, 8, 8, 0]} 
                  name="Revenue"
                  barSize={30}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Accounts Receivable Aging */}
      {hasAging && (
        <div className="chart-card">
          <div className="chart-header">
            <div>
              <h3>Accounts Receivable</h3>
              <p className="chart-subtitle">Outstanding balance</p>
            </div>
            <div className="stat-badge">
              <span className="stat-value-large">{formatNaira(data.agingData[0].amount)}</span>
              <span className="stat-label">Total Outstanding</span>
            </div>
          </div>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={data.agingData} margin={{ top: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" vertical={false} />
                <XAxis 
                  dataKey="range" 
                  stroke="#6b6b6b" 
                  tick={{ fill: '#a0a0a0', fontSize: 12 }}
                  axisLine={{ stroke: '#2a2a2a' }}
                />
                <YAxis 
                  stroke="#6b6b6b" 
                  tick={{ fill: '#a0a0a0', fontSize: 11 }}
                  tickFormatter={(v) => `₦${(v as number)/1000}k`}
                  axisLine={{ stroke: '#2a2a2a' }}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f59e0b', fillOpacity: 0.1 }} />
                <Bar 
                  dataKey="amount" 
                  fill="#f59e0b" 
                  radius={[8, 8, 0, 0]} 
                  name="Outstanding"
                  barSize={80}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* No Data Message */}
      {!hasRevenue && !hasExpenses && !hasCustomers && (
        <div className="chart-card full-width">
          <div className="empty-chart">
            <div className="empty-icon">📊</div>
            <h3>No Chart Data Available</h3>
            <p>Start creating invoices and recording expenses to see beautiful charts here.</p>
            <div className="empty-actions">
              <button className="btn-primary" onClick={() => window.location.href = '/sales/invoices/new'}>
                Create Invoice
              </button>
              <button className="btn-secondary" onClick={() => window.location.href = '/purchases/bills/new'}>
                Record Expense
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .dashboard-charts {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 1.5rem;
          margin-bottom: 2rem;
        }
        
        .chart-card {
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: 16px;
          padding: 1.5rem;
          transition: all 0.3s ease;
        }
        
        .chart-card:hover {
          border-color: var(--border-light);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        }
        
        .chart-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 1.5rem;
        }
        
        .chart-header h3 {
          font-size: 1rem;
          font-weight: 600;
          color: var(--text-primary);
          margin-bottom: 0.25rem;
        }
        
        .chart-subtitle {
          font-size: 0.75rem;
          color: var(--text-muted);
        }
        
        .chart-badge {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          background: var(--bg-tertiary);
          padding: 0.25rem 0.75rem;
          border-radius: 20px;
        }
        
        .badge-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
        }
        
        .badge-dot.revenue {
          background: #10b981;
          box-shadow: 0 0 8px rgba(16, 185, 129, 0.5);
        }
        
        .chart-badge span {
          font-size: 0.75rem;
          color: var(--text-secondary);
        }
        
        .stat-badge {
          text-align: right;
        }
        
        .stat-value-large {
          font-size: 1.5rem;
          font-weight: 700;
          color: var(--success);
          display: block;
          line-height: 1.2;
        }
        
        .stat-label {
          font-size: 0.7rem;
          color: var(--text-muted);
        }
        
        .chart-container {
          width: 100%;
          height: 280px;
        }
        
        .pie-container {
          display: flex;
          justify-content: center;
        }
        
        .full-width {
          grid-column: 1 / -1;
        }
        
        .empty-chart {
          text-align: center;
          padding: 2rem;
        }
        
        .empty-icon {
          font-size: 4rem;
          margin-bottom: 1rem;
          opacity: 0.5;
        }
        
        .empty-chart h3 {
          font-size: 1.125rem;
          margin-bottom: 0.5rem;
        }
        
        .empty-chart p {
          color: var(--text-muted);
          margin-bottom: 1.5rem;
        }
        
        .empty-actions {
          display: flex;
          gap: 1rem;
          justify-content: center;
        }
        
        .charts-loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 3rem;
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: 16px;
          text-align: center;
        }
        
        .spinner {
          width: 48px;
          height: 48px;
          border: 3px solid var(--border);
          border-top-color: var(--success);
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin-bottom: 1rem;
        }
        
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        
        .charts-empty {
          padding: 3rem;
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: 16px;
          text-align: center;
          color: var(--text-secondary);
        }
        
        .chart-tooltip {
          background: #1a1a1a;
          border: 1px solid #2a2a2a;
          padding: 10px 14px;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
        }
        
        .tooltip-title {
          color: #a0a0a0;
          font-size: 0.7rem;
          margin-bottom: 4px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        
        .tooltip-value {
          color: var(--text-primary);
          font-size: 1rem;
          font-weight: 600;
        }
        
        .tooltip-percentage {
          color: #6b6b6b;
          font-size: 0.7rem;
          margin-top: 4px;
        }
        
        @media (max-width: 1024px) {
          .dashboard-charts {
            grid-template-columns: 1fr;
          }
        }
        
        @media (max-width: 640px) {
          .chart-card {
            padding: 1rem;
          }
          
          .empty-actions {
            flex-direction: column;
          }
        }
      `}</style>
    </div>
  );
}