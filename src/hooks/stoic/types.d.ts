import { ReactNode } from 'react';
export type { HttpMethod } from './useOptimisticUpdate';

export interface RetryPolicy {
  maxRetries: number;
  backoffStrategy: 'fixed' | 'exponential';
  baseDelay: number;
}

export interface FetchConfig {
  retryPolicy: RetryPolicy;
  requestTimeout: number;
  headers: Record<string, string>;
  refetchInterval?: number;
  enableLocalStorage?: boolean;
  hidePageInUrl?: boolean;
  maxRollbackSteps?: number;
}

export interface StoicProviderProps {
  children: ReactNode;
  config?: Partial<FetchConfig>;
}

export interface CacheObject<T> {
  version: number;
  data: T;
}

export interface UseStoicConfig extends FetchConfig {
  retryPolicy: RetryPolicy;
  refetchInterval?: number;
  enableLocalStorage?: boolean;
  hidePageInUrl?: boolean;
  maxRollbackSteps?: number;
}

export interface UseCacheResult<T> {
  memoryCache: T | null;
  setMemoryCache: React.Dispatch<React.SetStateAction<T | null>>;
  loadFromLocalStorage: () => T | null;
  saveToCache: (newData: T) => void;
}

// You might want to add more utility types here as needed
export type Nullable<T> = T | null;
export type Optional<T> = T | undefined;

export type DataSource<T extends Record<string, any>> = string | ((params: { page: number; filters: Record<string, unknown> }) => Promise<T>);

export interface UseStoicResult<T extends Record<string, any>> {
  data: T | null;
  error: string | null;
  loading: boolean;
  retryCount: number;
  optimisticUpdate: (newData: Partial<T>, updateUrl?: string, method: HttpMethod = 'PUT') => Promise<T>
  rollback: () => void;
  nextPage: () => void;
  previousPage: () => void;
  goToPage: (pageNumber: number) => void;
  applyFilters: (newFilters: Record<string, unknown>) => void;
  currentPage: number;
  cancelRequest: () => void;
  isEmpty: () => boolean;
  refetch: () => void;
}