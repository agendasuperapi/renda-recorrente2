import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

export type EnvironmentFilter = 'test' | 'production';

interface EnvironmentContextType {
  environment: EnvironmentFilter;
  setEnvironment: (env: EnvironmentFilter) => void;
  isProduction: boolean;
  isTest: boolean;
}

const EnvironmentContext = createContext<EnvironmentContextType | undefined>(undefined);

const STORAGE_KEY = 'admin_environment_filter';
const SYNC_EVENT = 'admin-environment-change';

export function EnvironmentProvider({ children }: { children: React.ReactNode }) {
  const [environment, setEnvironmentState] = useState<EnvironmentFilter>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'test' || saved === 'production') {
      return saved;
    }
    return 'production'; // Default to production for safety
  });

  const setEnvironment = useCallback((env: EnvironmentFilter) => {
    setEnvironmentState(env);
    localStorage.setItem(STORAGE_KEY, env);
    // Dispatch custom event to sync across tabs
    window.dispatchEvent(new CustomEvent(SYNC_EVENT, { detail: env }));
  }, []);

  // Listen for changes from other tabs
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        const newEnv = e.newValue as EnvironmentFilter;
        if (newEnv === 'test' || newEnv === 'production') {
          setEnvironmentState(newEnv);
        }
      }
    };

    const handleCustomEvent = (e: CustomEvent<EnvironmentFilter>) => {
      setEnvironmentState(e.detail);
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener(SYNC_EVENT, handleCustomEvent as EventListener);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener(SYNC_EVENT, handleCustomEvent as EventListener);
    };
  }, []);

  const value: EnvironmentContextType = {
    environment,
    setEnvironment,
    isProduction: environment === 'production',
    isTest: environment === 'test',
  };

  return (
    <EnvironmentContext.Provider value={value}>
      {children}
    </EnvironmentContext.Provider>
  );
}

export function useEnvironment() {
  const context = useContext(EnvironmentContext);
  if (context === undefined) {
    throw new Error('useEnvironment must be used within an EnvironmentProvider');
  }
  return context;
}

// Hook para uso opcional (não lança erro se usado fora do provider)
export function useEnvironmentOptional() {
  return useContext(EnvironmentContext);
}
