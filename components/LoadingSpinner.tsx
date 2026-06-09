'use client';

interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large';
  text?: string;
}

export default function LoadingSpinner({ size = 'medium', text = 'Loading...' }: LoadingSpinnerProps) {
  const sizeMap = {
    small: '24px',
    medium: '48px',
    large: '64px'
  };

  return (
    <div className="loading-container">
      <div className="spinner" style={{ width: sizeMap[size], height: sizeMap[size] }}></div>
      {text && <p className="loading-text">{text}</p>}
      <style jsx>{`
        .loading-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 2rem;
        }
        .spinner {
          border: 3px solid var(--border);
          border-top-color: var(--success);
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        .loading-text {
          margin-top: 1rem;
          color: var(--text-secondary);
          font-size: 0.875rem;
        }
      `}</style>
    </div>
  );
}