import { useState, useCallback } from 'react';

export interface UseRollbackOptions {
  maxSteps?: number;
}

export interface UseRollbackResult<T> {
    currentData: T;
    addToHistory: (newData: T) => void;
    rollback: (steps?: number) => void;
  }
  
  export function useRollback<T>(
    initialData: T,
    maxSteps: number = 10,
    options: UseRollbackOptions = {}
  ): UseRollbackResult<T> {
    const [history, setHistory] = useState<T[]>([initialData]);
  
    const addToHistory = useCallback((newData: T) => {
      setHistory((prevHistory) => {
        const newHistory = [newData, ...prevHistory];
        return newHistory.slice(0, maxSteps);
      });
    }, [maxSteps]);
  
    const rollback = useCallback((steps: number = 1) => {
      setHistory((prevHistory) => {
        if (prevHistory.length > steps) {
          const newState = prevHistory[steps];
          return [newState, ...prevHistory.slice(steps)];
        }
        return prevHistory;
      });
    }, []);
  
    const currentData = history[0];
  
    return { currentData, addToHistory, rollback };
  }