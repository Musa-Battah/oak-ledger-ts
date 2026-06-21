'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, AuthState } from '@/types';
import toast from 'react-hot-toast';

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<boolean>;
  register: (name: string, email: string, password: string, organization_name: string) => Promise<boolean>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    token: null,
    isAuthenticated: false,
    isLoading: true,
  });

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        setState({
          user: data.user,
          token: data.token || null,
          isAuthenticated: true,
          isLoading: false,
        });
      } else {
        setState({
          user: null,
          token: null,
          isAuthenticated: false,
          isLoading: false,
        });
      }
    } catch (error) {
      setState({
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
      });
    }
  };

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      
      const data = await res.json();
      
      if (res.ok) {
        setState({
          user: data.user,
          token: data.token,
          isAuthenticated: true,
          isLoading: false,
        });
        toast.success('Login successful!');
        return true;
      } else {
        toast.error(data.error || 'Login failed');
        return false;
      }
    } catch (error) {
      toast.error('Login failed');
      return false;
    }
  };

  const register = async (
    name: string,
    email: string,
    password: string,
    organization_name: string
  ): Promise<boolean> => {
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, organization_name }),
      });
      
      const data = await res.json();
      
      if (res.ok) {
        setState({
          user: data.user,
          token: data.token,
          isAuthenticated: true,
          isLoading: false,
        });
        toast.success('Registration successful!');
        return true;
      } else {
        toast.error(data.error || 'Registration failed');
        return false;
      }
    } catch (error) {
      toast.error('Registration failed');
      return false;
    }
  };

  const logout = async (): Promise<void> => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      setState({
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
      });
      toast.success('Logged out successfully');
    } catch (error) {
      toast.error('Logout failed');
    }
  };

  const refreshUser = async (): Promise<void> => {
    await checkAuth();
  };

  return (
    <AuthContext.Provider value={{ ...state, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}