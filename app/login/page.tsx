'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const success = await login(email, password);
    if (success) {
      router.push('/dashboard');
    } else {
      setError('Invalid email or password');
    }
    setLoading(false);
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h1>Welcome Back</h1>
          <p>Sign in to your Oak Ledger account</p>
        </div>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label>Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
            />
          </div>

          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={8}
            />
          </div>

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="auth-footer">
          <p>
            Don't have an account? <Link href="/register">Sign up</Link>
          </p>
        </div>
      </div>

      <style jsx>{`
        .auth-container {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 80vh;
          padding: 2rem;
        }
        .auth-card {
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: 16px;
          padding: 2.5rem;
          max-width: 400px;
          width: 100%;
        }
        .auth-header {
          text-align: center;
          margin-bottom: 2rem;
        }
        .auth-header h1 {
          font-size: 1.5rem;
          font-weight: 700;
          margin-bottom: 0.5rem;
          color: var(--text-primary);
        }
        .auth-header p {
          color: var(--text-secondary);
          font-size: 0.875rem;
        }
        .auth-error {
          background: var(--danger-dim);
          color: var(--danger);
          padding: 0.75rem;
          border-radius: 8px;
          margin-bottom: 1rem;
          font-size: 0.875rem;
          text-align: center;
        }
        .auth-form {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        .auth-form .form-group label {
          display: block;
          margin-bottom: 0.25rem;
          font-size: 0.875rem;
          font-weight: 500;
          color: var(--text-secondary);
        }
        .auth-form .form-group input {
          width: 100%;
          padding: 0.75rem;
          background: var(--bg-secondary);
          border: 1px solid var(--border-light);
          border-radius: 8px;
          color: var(--text-primary);
          font-size: 0.875rem;
        }
        .auth-form .form-group input:focus {
          outline: none;
          border-color: var(--success);
        }
        .auth-form button {
          width: 100%;
          padding: 0.75rem;
          margin-top: 0.5rem;
        }
        .auth-footer {
          text-align: center;
          margin-top: 1.5rem;
          font-size: 0.875rem;
          color: var(--text-secondary);
        }
        .auth-footer a {
          color: var(--success);
          text-decoration: none;
          font-weight: 500;
        }
        .auth-footer a:hover {
          text-decoration: underline;
        }
      `}</style>
    </div>
  );
}