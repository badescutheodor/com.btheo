import { useState, useCallback } from 'react';

interface CacheObject<T> {
  version: number;
  data: T;
}

export function useCache<T>(key: string, initialData: T, enableLocalStorage?: boolean) {
  const [memoryCache, setMemoryCache] = useState<T>(initialData);
  const [localStorageVersion, setLocalStorageVersion] = useState(0);

  const loadFromLocalStorage = useCallback((): T | null => {
    if (!enableLocalStorage) return null;
    const cachedData = localStorage.getItem(key);
    if (cachedData) {
      try {
        const { version, data } = JSON.parse(cachedData) as CacheObject<T>;
        setLocalStorageVersion(version);
        return data;
      } catch (error) {
        console.error('Error parsing cached data:', error);
        return null;
      }
    }
    return null;
  }, [key, enableLocalStorage]);

  const saveToCache = useCallback(
    (newData: T) => {
      if (!enableLocalStorage) return;
      const cacheObject: CacheObject<T> = {
        version: localStorageVersion + 1,
        data: newData,
      };
      try {
        localStorage.setItem(key, JSON.stringify(cacheObject));
        setLocalStorageVersion((prev) => prev + 1);
      } catch (error) {
        console.error('Error saving data to cache:', error);
      }
    },
    [key, enableLocalStorage, localStorageVersion]
  );

  return {
    memoryCache,
    setMemoryCache,
    loadFromLocalStorage,
    saveToCache,
  };
}