'use client';

import { useState, useCallback } from 'react';

interface UseLoadingReturn {
  isLoading: boolean;
  error: string | null;
  startLoading: () => void;
  stopLoading: () => void;
  setError: (error: string | null) => void;
  withLoading: <T>(fn: () => Promise<T>) => Promise<T | null>;
}

export function useLoading(initialLoading: boolean = false): UseLoadingReturn {
  const [isLoading, setIsLoading] = useState<boolean>(initialLoading);
  const [error, setError] = useState<string | null>(null);

  const startLoading = useCallback(() => {
    setIsLoading(true);
    setError(null);
  }, []);

  const stopLoading = useCallback(() => {
    setIsLoading(false);
  }, []);

  const withLoading = useCallback(async <T>(fn: () => Promise<T>): Promise<T | null> => {
    startLoading();
    try {
      const result = await fn();
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An error occurred';
      setError(message);
      return null;
    } finally {
      stopLoading();
    }
  }, [startLoading, stopLoading]);

  return {
    isLoading,
    error,
    startLoading,
    stopLoading,
    setError,
    withLoading,
  };
}