import { useState, useCallback } from 'react';

export interface RetryPolicy {
  maxRetries: number;
  backoffStrategy: 'fixed' | 'exponential';
  baseDelay: number;
}

type FetchFunction = () => Promise<void>;

interface UseRetryResult {
  retry: (fetchFunction: FetchFunction) => void;
  retryCount: number;
  resetRetry: () => void;
}

export function useRetry(retryPolicy: RetryPolicy): UseRetryResult {
  const [retryCount, setRetryCount] = useState(0);

  const retry = useCallback(
    (fetchFunction: FetchFunction) => {
      if (retryCount >= retryPolicy.maxRetries) return;

      const delay =
        retryPolicy.backoffStrategy === 'exponential'
          ? Math.pow(2, retryCount) * retryPolicy.baseDelay
          : retryPolicy.baseDelay;

      setTimeout(() => {
        fetchFunction();
        setRetryCount((prev) => prev + 1);
      }, delay);
    },
    [retryCount, retryPolicy]
  );

  const resetRetry = useCallback(() => setRetryCount(0), []);

  return { retry, retryCount, resetRetry };
}