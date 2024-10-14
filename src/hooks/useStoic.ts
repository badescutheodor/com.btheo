import { useEffect, useCallback, useState, useMemo, useRef } from 'react';
import {
  FetchConfig,
  DataSource,
  UseStoicResult,
  useCache,
  useRetry,
  useInterval,
  useOptimisticUpdate,
  updateUrlQueryCompat,
  useRouterCompat,
  useFetchConfig,
  isNextJs,
  getQueryParams,
  HttpMethod,
} from './stoic';

export interface RetryPolicy {
    maxRetries: number;
    backoffStrategy: "fixed" | "exponential";
    baseDelay: number;
}

interface UseStoicConfig extends FetchConfig {
  retryPolicy: RetryPolicy;
  requestTimeout: number;
  headers: Record<string, string>;
  refetchInterval?: number;
  enableLocalStorage?: boolean;
  hidePageInUrl?: boolean;
  maxRollbackSteps?: number;
}

export const useStoic = <T extends Record<string, any>>(
    dataSource: DataSource<T>,
    customConfig?: Partial<FetchConfig>
  ): UseStoicResult<T> => {
  const globalConfig = useFetchConfig();
  const config: UseStoicConfig = { ...globalConfig, ...customConfig };

  const router = useRouterCompat();
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState<Record<string, unknown>>({});
  const scrollKey = `${router.pathname}-scroll`;
  const abortControllerRef = useRef<AbortController | null>(null);

  // Calculate a stable cache key based on the dataSource
  const cacheKey = useMemo(() => {
        if (typeof dataSource === 'string') {
            return dataSource;
        } else if (typeof dataSource === 'function') {
            // For function data sources, use a combination of the function name and its stringified version
            return `fn-${dataSource.name}-${dataSource.toString().slice(0, 100)}`;
        } else {
            // Fallback for any other type (though this should not happen given the DataSource type)
            return 'default-key';
        }
  }, [dataSource]);

  const { memoryCache, setMemoryCache, loadFromLocalStorage, saveToCache } = useCache<T | null>(
    cacheKey,
    null,
    config.enableLocalStorage
  );

  const { retry, retryCount } = useRetry(config.retryPolicy);
  const initialOptimisticData = useMemo(() => memoryCache ?? ({} as T), [memoryCache]);
  const { optimisticData, optimisticUpdate, rollback } = useOptimisticUpdate<T>(initialOptimisticData, {
    maxRollbackSteps: config.maxRollbackSteps,
  });

  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const cancelRequest = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setLoading(false);
    }
  }, []);

  const fetchData = useCallback(async () => {
    cancelRequest(); // Cancel any ongoing request
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    setLoading(true);
    setError(null);

    try {
      let result: T;
      if (typeof dataSource === 'function') {
        result = await dataSource({ page: currentPage, filters });
      } else {
        const response = await fetch(dataSource, { headers: config.headers, signal });
        if (!response.ok) throw new Error(`Failed to fetch: ${response.statusText}`);
        result = await response.json();
      }
      setData(result);
      setMemoryCache(result);
      saveToCache(result);
    } catch (err: any) { 
        if (err.name === 'AbortError') {
        // Request was aborted, do nothing
            return;
        }

      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [dataSource, currentPage, filters, config.headers, setMemoryCache, saveToCache]);

  const refetch = useCallback(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    const cachedData = loadFromLocalStorage();
    if (cachedData) {
      setMemoryCache(cachedData);
      setData(cachedData);
    } else {
      fetchData();
    }
  }, [fetchData, loadFromLocalStorage, setMemoryCache]);

  useEffect(() => {
    if (error && retryCount < config.retryPolicy.maxRetries) {
      retry(fetchData);
    }
  }, [error, retryCount, retry, fetchData, config.retryPolicy.maxRetries]);

  if (config.refetchInterval) {
    useInterval(fetchData, config.refetchInterval);
  }

  useEffect(() => {
    const queryParams = getQueryParams(router);
    const page = queryParams['page'] || '1';
    setCurrentPage(Number(page));
  
    const filtersFromUrl = { ...queryParams };
    delete filtersFromUrl.page;
    setFilters(filtersFromUrl);
  }, [router]);

  useEffect(() => {
    const handleRouteChangeStart = () => {
      sessionStorage.setItem(scrollKey, window.scrollY.toString());
    };

    const handleRouteChangeComplete = () => {
      const savedScroll = sessionStorage.getItem(scrollKey);
      if (savedScroll !== null) {
        window.scrollTo(0, parseInt(savedScroll, 10));
      }
    };

    if (isNextJs()) {
      (router as any).events.on('routeChangeStart', handleRouteChangeStart);
      (router as any).events.on('routeChangeComplete', handleRouteChangeComplete);
    } else {
      // For non-Next.js applications, we'll use the `useEffect` cleanup function
      // to handle scroll restoration when the component unmounts or re-renders
      return () => {
        handleRouteChangeStart();
        handleRouteChangeComplete();
      };
    }

    // Initial scroll restoration
    const savedScroll = sessionStorage.getItem(scrollKey);
    if (savedScroll !== null) {
      window.scrollTo(0, parseInt(savedScroll, 10));
    }

    return () => {
      if (isNextJs()) {
        (router as any).events.off('routeChangeStart', handleRouteChangeStart);
        (router as any).events.off('routeChangeComplete', handleRouteChangeComplete);
      }
    };
  }, [router, scrollKey]);
  
  const nextPage = useCallback(() => {
    const newPage = currentPage + 1;
    setCurrentPage(newPage);
    updateUrlQueryCompat(router, { ...filters, newPage });
    fetchData();
  }, [currentPage, filters, router, fetchData]);

  const previousPage = useCallback(() => {
    const newPage = Math.max(currentPage - 1, 1);
    setCurrentPage(newPage);
    updateUrlQueryCompat(router, { ...filters, newPage });
    fetchData();
  }, [currentPage, filters, router, fetchData]);

  const goToPage = useCallback((pageNumber: number) => {
    setCurrentPage(pageNumber);
    updateUrlQueryCompat(router, { ...filters, newPage: pageNumber });
    fetchData();
  }, [filters, router, fetchData]);

  const applyFilters = useCallback((newFilters: Record<string, unknown>) => {
    setFilters(newFilters);
    setCurrentPage(1);
    updateUrlQueryCompat(router, { ...newFilters, newPage: 1 });
    fetchData();
  }, [router, fetchData]);

  const isEmpty = useCallback(() => {
    const currentData = optimisticData || memoryCache || data;
    if (currentData === null) return true;
    if (Array.isArray(currentData)) return currentData.length === 0;
    if (typeof currentData === 'object') return Object.keys(currentData).length === 0;
    return false;
  }, [optimisticData, memoryCache, data]);

  return {
    data: optimisticData || memoryCache || data,
    error,
    loading,
    retryCount,
    optimisticUpdate: async (data: Partial<T>, updateUrl?: string, method: HttpMethod = 'PUT') => {
        const newData = await optimisticUpdate(data, updateUrl, method);;
        setMemoryCache(newData);
        saveToCache(newData);
        return newData;
    },
    rollback,
    nextPage,
    previousPage,
    goToPage,
    applyFilters,
    currentPage,
    cancelRequest,
    isEmpty,
    refetch
  };
};