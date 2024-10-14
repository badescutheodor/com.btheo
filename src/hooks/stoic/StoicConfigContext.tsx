import React, { createContext, useContext, ReactNode } from "react";

export interface RetryPolicy {
  maxRetries: number;
  backoffStrategy: "fixed" | "exponential";
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

const defaultFetchConfig: FetchConfig = {
  retryPolicy: {
    maxRetries: 3,
    backoffStrategy: "fixed",
    baseDelay: 500,
  },
  requestTimeout: 5000,
  headers: {},
};

const StoicConfigContext = createContext<FetchConfig>(defaultFetchConfig);

interface StoicProviderProps {
  children: ReactNode;
  config?: Partial<FetchConfig>;
}

export const StoicProvider: React.FC<StoicProviderProps> = ({
  children,
  config,
}) => {
  const mergedConfig: FetchConfig = { ...defaultFetchConfig, ...config };
  return (
    <StoicConfigContext.Provider value={mergedConfig}>
      {children}
    </StoicConfigContext.Provider>
  );
};

export const useFetchConfig = (): FetchConfig => {
  return useContext(StoicConfigContext);
};
