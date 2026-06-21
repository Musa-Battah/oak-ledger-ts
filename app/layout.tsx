import type { Metadata } from 'next';
import Navbar from '@/components/Navbar';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from '@/contexts/AuthContext';
import ErrorBoundary from '@/components/ErrorBoundary';
import './globals.css';

export const metadata: Metadata = {
  title: 'Oak Ledger - Double Entry Accounting System',
  description: 'Professional accounting application with double-entry bookkeeping for Nigerian businesses',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <ErrorBoundary>
          <AuthProvider>
            <Navbar />
            <main className="container">
              {children}
            </main>
            <Toaster 
              position="top-right"
              toastOptions={{
                duration: 4000,
                style: {
                  background: '#111111',
                  color: '#ededed',
                  border: '1px solid #2a2a2a',
                  borderRadius: '8px',
                },
                success: {
                  duration: 3000,
                  iconTheme: {
                    primary: '#10b981',
                    secondary: 'white',
                  },
                },
                error: {
                  duration: 5000,
                  iconTheme: {
                    primary: '#ef4444',
                    secondary: 'white',
                  },
                },
                loading: {
                  duration: Infinity,
                },
              }}
            />
          </AuthProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}