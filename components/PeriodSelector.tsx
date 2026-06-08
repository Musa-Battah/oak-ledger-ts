'use client';

interface PeriodSelectorProps {
  currentPeriod: string;
}

export default function PeriodSelector({ currentPeriod }: PeriodSelectorProps) {
  const handlePeriodChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const period = e.target.value;
    window.location.href = `/reports/profit-loss?period=${period}`;
  };
  
  return (
    <select 
      name="period"
      className="btn-secondary" 
      defaultValue={currentPeriod}
      onChange={handlePeriodChange}
    >
      <option value="today">Today</option>
      <option value="week">This Week</option>
      <option value="month">This Month</option>
      <option value="quarter">This Quarter</option>
      <option value="year">This Year</option>
    </select>
  );
}