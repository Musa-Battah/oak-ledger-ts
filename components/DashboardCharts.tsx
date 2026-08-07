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
  return `₦${value.toLocaleString()}`;
};

// Custom Tooltip Components
const CustomTooltip = ({ active, payload, label, color }: any) => {
  if (active && payload && payload.length && payload[0].value > 0) {
    return (
      <div className="custom-tooltip">
        <div className="tooltip-label">{label}</div>
        <div className="tooltip-value" style={{ color: color || '#10b981' }}>
          {formatNaira(payload[0].value)}
        </div>
      </div>
    );
  }
  return null;
};

const CustomPieTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length && payload[0].value > 0) {
    return (
      <div className="custom-tooltip">
        <div className="tooltip-label">{payload[0].name}</div>
        <div className="tooltip-value">{formatNaira(payload[0].value)}</div>
        <div className="tooltip-percent">({(payload[0].percent * 100).toFixed(1)}%)</div>
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

  const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec489a'];

  const renderPieLabel = (entry: any) => {
    return `${entry.name}: ${(entry.percent * 100).toFixed(0)}%`;
  };

  return (
    <div className="dashboard-charts">
      {/* Revenue Trend Chart */}
      {hasRevenue && (
        <div className="chart-card">
          <h3>Revenue Trend</h3>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={data.monthlyRevenue}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
                <XAxis dataKey="month" stroke="#a0a0a0" />
                <YAxis stroke="#a0a0a0" tickFormatter={(v) => `₦${(v as number)/1000}k`} />
                <Tooltip content={<CustomTooltip color="#10b981" />} />
                <Area type="monotone" dataKey="amount" stroke="#10b981" fill="#10b981" fillOpacity={0.2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Expense Breakdown */}
      {hasExpenses && (
        <div className="chart-card">
          <h3>Expense Breakdown</h3>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={data.expenseBreakdown}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={renderPieLabel}
                  outerRadius={80}
                  dataKey="value"
                  nameKey="name"
                >
                  {data.expenseBreakdown.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomPieTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Top Customers */}
      {hasCustomers && (
        <div className="chart-card">
          <h3>Top Customers</h3>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={data.topCustomers} layout="vertical">
                <XAxis type="number" stroke="#a0a0a0" tickFormatter={(v) => `₦${(v as number)/1000}k`} />
                <YAxis type="category" dataKey="name" stroke="#a0a0a0" width={100} />
                <Tooltip content={<CustomTooltip color="#3b82f6" />} />
                <Bar dataKey="amount" fill="#3b82f6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Accounts Receivable Aging */}
      {hasAging && (
        <div className="chart-card">
          <h3>Accounts Receivable</h3>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={data.agingData}>
                <XAxis dataKey="range" stroke="#a0a0a0" />
                <YAxis stroke="#a0a0a0" tickFormatter={(v) => `₦${(v as number)/1000}k`} />
                <Tooltip content={<CustomTooltip color="#f59e0b" />} />
                <Bar dataKey="amount" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* No Data Message */}
      {!hasRevenue && !hasExpenses && !hasCustomers && (
        <div className="chart-card full-width">
          <h3>No Chart Data Available</h3>
          <p>Create invoices, record expenses, or add journal entries to see charts.</p>
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
          border-radius: 12px;
          padding: 1.25rem;
        }
        .chart-card h3 {
          font-size: 1rem;
          font-weight: 600;
          margin-bottom: 1rem;
          color: var(--text-primary);
        }
        .chart-container {
          width: 100%;
          height: 250px;
        }
        .charts-loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 2rem;
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: 12px;
          text-align: center;
        }
        .spinner {
          width: 40px;
          height: 40px;
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
          padding: 2rem;
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: 12px;
          text-align: center;
          color: var(--text-secondary);
        }
        .custom-tooltip {
          background: #111111;
          border: 1px solid #2a2a2a;
          padding: 8px 12px;
          border-radius: 4px;
        }
        .tooltip-label {
          color: #a0a0a0;
          font-size: 0.75rem;
          margin-bottom: 4px;
        }
        .tooltip-value {
          font-size: 0.875rem;
          font-weight: 600;
        }
        .tooltip-percent {
          color: #6b6b6b;
          font-size: 0.7rem;
          margin-top: 2px;
        }
        .full-width {
          grid-column: 1 / -1;
          text-align: center;
          padding: 3rem;
        }
        @media (max-width: 1024px) {
          .dashboard-charts {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}