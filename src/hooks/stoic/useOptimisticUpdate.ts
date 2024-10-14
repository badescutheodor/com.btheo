import { useCallback, useEffect } from 'react';
import { useQueue } from './useQueue';
import { useRollback } from './useRollback';

interface OptimisticUpdateOptions {
  maxRollbackSteps?: number;
}

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

export function useOptimisticUpdate<T extends Record<string, any>>(
  initialData: T,
  options: OptimisticUpdateOptions = {}
) {
  const { maxRollbackSteps = 10 } = options;
  const { currentData, addToHistory, rollback } = useRollback(initialData, maxRollbackSteps);
  const { queueRequest, retryQueuedRequests } = useQueue<Partial<T>>();

  useEffect(() => {
    const handleOnline = () => {
      console.log('Online: retrying queued requests');
      retryQueuedRequests();
    };

    window.addEventListener('online', handleOnline);
    return () => {
      window.removeEventListener('online', handleOnline);
    };
  }, [retryQueuedRequests]);

  const optimisticUpdate = useCallback(
    async (newData: Partial<T>, updateUrl?: string, method: HttpMethod = 'PUT'): Promise<T> => {
      addToHistory(currentData);

      const updatedData = {
        ...currentData,
        ...newData,
      };

      if (updateUrl && method) {
        if (!navigator.onLine) {
          console.log('Offline: queuing request');
          queueRequest(newData, updateUrl, method);
          return updatedData;
        }
  
        await fetch(updateUrl, {
          method,
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(newData),
        })
          .then((response) => {
            if (!response.ok) {
              throw new Error('Failed to update');
            }
            return response.json();
          })
          .catch((error) => {
            console.error('Update failed, rolling back:', error);
            rollback();
          });
      }

      return updatedData;
    },
    [currentData, addToHistory, queueRequest, rollback]
  );

  return { optimisticData: currentData, optimisticUpdate, rollback };
}