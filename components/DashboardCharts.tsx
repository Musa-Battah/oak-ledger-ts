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
      if (result.success) {
        setData(result.data);
      }
    } catch (error) {
      console.error('Error fetching chart data:', error);
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
        <p>No data available for charts</p>
      </div>
    );
  }

  const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec489a'];

  return (
    <div className="dashboard-charts">
      {/* Revenue Trend Chart */}
      <div className="chart-card">
        <div className="chart-header">
          <h3>Revenue Trend (Last 6 Months)</h3>
          <p className="chart-subtitle">Monthly revenue performance</p>
        </div>
        <div className="chart-container">
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={data.monthlyRevenue}>
              <defs>
                <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
              <XAxis dataKey="month" stroke="#a0a0a0" />
              <YAxis stroke="#a0a0a0" tickFormatter={(value) => `₦${value/1000}k`} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#111111', border: '1px solid #2a2a2a' }}
                labelStyle={{ color: '#ededed' }}
                formatter={(value: number) => [`₦${value.toLocaleString()}`, 'Revenue']}
              />
              <Legend />
              <Area 
                type="monotone" 
                dataKey="amount" 
                stroke="#10b981" 
                strokeWidth={2}
                fill="url(#revenueGradient)"
                name="Revenue"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Expense Breakdown Pie Chart */}
      <div className="chart-card">
        <div className="chart-header">
          <h3>Expense Breakdown</h3>
          <p className="chart-subtitle">Top expense categories</p>
        </div>
        <div className="chart-container pie-container">
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={data.expenseBreakdown}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {data.expenseBreakdown.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ backgroundColor: '#111111', border: '1px solid #2a2a2a' }}
                formatter={(value: number) => [`₦${value.toLocaleString()}`, 'Amount']}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top Customers Bar Chart */}
      <div className="chart-card">
        <div className="chart-header">
          <h3>Top Customers by Revenue</h3>
          <p className="chart-subtitle">Highest paying customers</p>
        </div>
        <div className="chart-container">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.topCustomers} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
              <XAxis type="number" stroke="#a0a0a0" tickFormatter={(value) => `₦${value/1000}k`} />
              <YAxis type="category" dataKey="name" stroke="#a0a0a0" width={100} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#111111', border: '1px solid #2a2a2a' }}
                formatter={(value: number) => [`₦${value.toLocaleString()}`, 'Revenue']}
              />
              <Bar dataKey="amount" fill="#3b82f6" radius={[0, 4, 4, 0]} name="Revenue" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Accounts Receivable Aging */}
      <div className="chart-card">
        <div className="chart-header">
          <h3>Accounts Receivable Aging</h3>
          <p className="chart-subtitle">Outstanding invoices by age</p>
        </div>
        <div className="chart-container">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.agingData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
              <XAxis dataKey="range" stroke="#a0a0a0" />
              <YAxis stroke="#a0a0a0" tickFormatter={(value) => `₦${value/1000}k`} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#111111', border: '1px solid #2a2a2a' }}
                formatter={(value: number) => [`₦${value.toLocaleString()}`, 'Outstanding']}
              />
              <Bar dataKey="amount" fill="#f59e0b" radius={[4, 4, 0, 0]} name="Outstanding" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

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
          padding: 1.5rem;
        }
        
        .chart-header {
          margin-bottom: 1rem;
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
        
        .chart-container {
          width: 100%;
          height: 300px;
        }
        
        .charts-loading,
        .charts-empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 3rem;
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
        
        @media (max-width: 1024px) {
          .dashboard-charts {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}