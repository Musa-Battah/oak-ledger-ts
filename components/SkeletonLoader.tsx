'use client';

interface SkeletonLoaderProps {
  type?: 'table' | 'card' | 'form';
  rows?: number;
}

export default function SkeletonLoader({ type = 'card', rows = 5 }: SkeletonLoaderProps) {
  if (type === 'table') {
    return (
      <div className="skeleton-table">
        <div className="skeleton-header">
          <div className="skeleton-line"></div>
          <div className="skeleton-line"></div>
          <div className="skeleton-line"></div>
          <div className="skeleton-line"></div>
        </div>
        {Array(rows).fill(0).map((_, i) => (
          <div key={i} className="skeleton-row">
            <div className="skeleton-line"></div>
            <div className="skeleton-line"></div>
            <div className="skeleton-line"></div>
            <div className="skeleton-line"></div>
          </div>
        ))}
      </div>
    );
  }

  if (type === 'form') {
    return (
      <div className="skeleton-form">
        {Array(rows).fill(0).map((_, i) => (
          <div key={i} className="skeleton-field">
            <div className="skeleton-label"></div>
            <div className="skeleton-input"></div>
          </div>
        ))}
      </div>
    );
  }

  // Default card skeleton
  return (
    <div className="skeleton-card">
      <div className="skeleton-header-line"></div>
      {Array(rows).fill(0).map((_, i) => (
        <div key={i} className="skeleton-line"></div>
      ))}
    </div>
  );
}