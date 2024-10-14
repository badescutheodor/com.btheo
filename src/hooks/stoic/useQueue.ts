import { useState, useCallback } from 'react';

interface QueuedRequest<T> {
  newData: T;
  updateUrl: string;
  method: string;
}

export function useQueue<T>() {
  const [queue, setQueue] = useState<QueuedRequest<T>[]>([]);

  const queueRequest = useCallback((newData: T, updateUrl: string, method: string) => {
    setQueue((prevQueue) => [
      ...prevQueue,
      { newData, updateUrl, method },
    ]);
  }, []);

  const retryQueuedRequests = useCallback(async () => {
    for (const request of queue) {
      const { newData, updateUrl, method } = request;
      try {
        const response = await fetch(updateUrl, {
          method,
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(newData),
        });
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
      } catch (error) {
        console.error('Failed to process request:', error);
      }
    }
    setQueue([]); // Clear the queue after processing
  }, [queue]);

  return { queueRequest, retryQueuedRequests };
}