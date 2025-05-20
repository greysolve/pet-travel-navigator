
import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface SystemRole {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
  permissions: string[] | null;
}

export interface SystemPlan {
  id: string;
  name: string;
  description: string | null;
  search_limit: number;
  is_search_unlimited: boolean;
  renews_monthly: boolean;
  created_at: string;
  updated_at: string;
}

interface SystemConfigContextType {
  roles: SystemRole[];
  plans: SystemPlan[];
  isLoading: boolean;
  error: Error | null;
  refreshConfig: () => Promise<void>;
}

const SystemConfigContext = createContext<SystemConfigContextType | undefined>(undefined);

export function SystemConfigProvider({ children }: { children: React.ReactNode }) {
  const [roles, setRoles] = useState<SystemRole[]>([]);
  const [plans, setPlans] = useState<SystemPlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchSystemConfig = async () => {
    setIsLoading(true);
    try {
      // Fetch roles using the secure function
      const { data: rolesData, error: rolesError } = await supabase
        .rpc('get_system_roles');

      if (rolesError) throw rolesError;

      // Fetch plans using the secure function
      const { data: plansData, error: plansError } = await supabase
        .rpc('get_system_plans');

      if (plansError) throw plansError;

      setRoles(rolesData || []);
      setPlans(plansData || []);
      setError(null);
    } catch (err) {
      console.error('Error fetching system configuration:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch system configuration'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSystemConfig();
  }, []);

  return (
    <SystemConfigContext.Provider
      value={{
        roles,
        plans,
        isLoading,
        error,
        refreshConfig: fetchSystemConfig
      }}
    >
      {children}
    </SystemConfigContext.Provider>
  );
}

export function useSystemConfig() {
  const context = useContext(SystemConfigContext);
  if (context === undefined) {
    throw new Error('useSystemConfig must be used within a SystemConfigProvider');
  }
  return context;
}
