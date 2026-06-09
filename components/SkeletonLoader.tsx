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
        <style jsx>{`
          .skeleton-table {
            background: var(--bg-card);
            border: 1px solid var(--border);
            border-radius: 12px;
            padding: 1rem;
          }
          .skeleton-header, .skeleton-row {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 1rem;
            padding: 0.75rem 0;
            border-bottom: 1px solid var(--border);
          }
          .skeleton-header {
            border-bottom: 1px solid var(--border);
          }
          .skeleton-line {
            height: 20px;
            background: linear-gradient(90deg, var(--bg-tertiary) 25%, var(--border) 50%, var(--bg-tertiary) 75%);
            background-size: 200% 100%;
            animation: shimmer 1.5s infinite;
            border-radius: 4px;
          }
          @keyframes shimmer {
            0% { background-position: 200% 0; }
            100% { background-position: -200% 0; }
          }
        `}</style>
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
        <style jsx>{`
          .skeleton-form {
            background: var(--bg-card);
            border: 1px solid var(--border);
            border-radius: 12px;
            padding: 1.5rem;
          }
          .skeleton-field {
            margin-bottom: 1rem;
          }
          .skeleton-label {
            width: 100px;
            height: 14px;
            background: var(--bg-tertiary);
            margin-bottom: 0.5rem;
            border-radius: 4px;
          }
          .skeleton-input {
            height: 42px;
            background: var(--bg-tertiary);
            border-radius: 8px;
          }
        `}</style>
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
      <style jsx>{`
        .skeleton-card {
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 1.5rem;
        }
        .skeleton-header-line {
          height: 24px;
          width: 60%;
          background: var(--bg-tertiary);
          margin-bottom: 1rem;
          border-radius: 4px;
        }
        .skeleton-line {
          height: 16px;
          background: var(--bg-tertiary);
          margin-bottom: 0.75rem;
          border-radius: 4px;
        }
        .skeleton-line:last-child {
          width: 80%;
        }
      `}</style>
    </div>
  );
}