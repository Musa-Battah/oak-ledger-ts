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
      <div 
        className="spinner" 
        style={{ 
          width: sizeMap[size], 
          height: sizeMap[size],
          border: '3px solid var(--border)',
          borderTopColor: 'var(--success)',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }}
      />
      {text && <p className="loading-text">{text}</p>}
    </div>
  );
}