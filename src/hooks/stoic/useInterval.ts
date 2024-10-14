import { useEffect, useRef } from 'react';

type IntervalCallback = () => void;

export function useInterval(callback: IntervalCallback, delay: number): void {
  const savedCallback = useRef<IntervalCallback>();

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    if (delay !== null) {
      const id = setInterval(() => {
        if (savedCallback.current) {
          savedCallback.current();
        }
      }, delay);
      return () => clearInterval(id);
    }
  }, [delay]);
}