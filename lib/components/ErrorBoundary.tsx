'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('Error caught by boundary:', error, errorInfo);
    // You could log to an error tracking service here
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="error-boundary">
          <div className="error-boundary-content">
            <div className="error-icon">⚠️</div>
            <h2>Something went wrong</h2>
            <p>{this.state.error?.message || 'An unexpected error occurred'}</p>
            <button 
              className="btn-primary"
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.href = '/';
              }}
            >
              Go to Dashboard
            </button>
            <button 
              className="btn-secondary"
              onClick={() => window.location.reload()}
            >
              Reload Page
            </button>
          </div>
          <style jsx>{`
            .error-boundary {
              position: fixed;
              top: 0;
              left: 0;
              right: 0;
              bottom: 0;
              background: rgba(0, 0, 0, 0.95);
              display: flex;
              align-items: center;
              justify-content: center;
              z-index: 9999;
            }
            .error-boundary-content {
              background: white;
              padding: 2rem;
              border-radius: 12px;
              text-align: center;
              max-width: 500px;
              margin: 1rem;
            }
            .error-icon {
              font-size: 3rem;
              margin-bottom: 1rem;
            }
            .error-boundary-content h2 {
              margin-bottom: 0.5rem;
              color: #333;
            }
            .error-boundary-content p {
              margin-bottom: 1.5rem;
              color: #666;
              font-size: 0.875rem;
            }
            .error-boundary-content button {
              margin: 0 0.5rem;
            }
          `}</style>
        </div>
      );
    }

    return this.props.children;
  }
}