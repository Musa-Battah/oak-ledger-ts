'use client';

interface PeriodSelectorProps {
  currentPeriod: string;
  onChange?: (period: string) => void;
}

export default function PeriodSelector({ currentPeriod, onChange }: PeriodSelectorProps) {
  const handlePeriodChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const period = e.target.value;
    if (onChange) {
      onChange(period);
    } else {
      window.location.href = `/reports/profit-loss?period=${period}`;
    }
  };
  
  return (
    <select 
      name="period"
      className="btn-secondary" 
      defaultValue={currentPeriod}
      onChange={handlePeriodChange}
    >
      <option value="all">All Time</option>
      <option value="today">Today</option>
      <option value="week">This Week</option>
      <option value="month">This Month</option>
      <option value="quarter">This Quarter</option>
      <option value="year">This Year</option>
      <option value="custom">Custom Range</option>
    </select>
  );
}