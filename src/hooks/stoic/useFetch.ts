import { useState, useCallback, useRef } from 'react';

interface UseFetchResult<T> {
  data: T | null;
  error: Error | null;
  loading: boolean;
  fetchData: () => Promise<void>;
  cancelRequest: () => void;
}

interface FetchOptions extends RequestInit {
  timeout?: number;
}

function handleFetchError(error: unknown): Error {
  if (error instanceof Error) {
    return error;
  }
  return new Error('An unknown error occurred');
}

export function useFetch<T>(url: string, options: FetchOptions = {}): UseFetchResult<T> {
  const { timeout = 5000, ...fetchOptions } = options;
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const controllerRef = useRef<AbortController | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    const controller = new AbortController();
    controllerRef.current = controller;
    const timer = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, { 
        ...fetchOptions, 
        signal: controller.signal 
      });
      if (!response.ok) throw new Error(`Error: ${response.status}`);
      const result = await response.json();
      setData(result);
    } catch (err) {
      setError(handleFetchError(err));
    } finally {
      clearTimeout(timer);
      setLoading(false);
    }
  }, [url, fetchOptions, timeout]);

  const cancelRequest = useCallback(() => {
    if (controllerRef.current) {
      controllerRef.current.abort();
    }
  }, []);

  return { data, error, loading, fetchData, cancelRequest };
}