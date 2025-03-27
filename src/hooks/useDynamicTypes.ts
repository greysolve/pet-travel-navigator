
import { useSystemConfig } from '@/contexts/SystemConfigContext';

export function useDynamicTypes() {
  const { roles, plans, isLoading } = useSystemConfig();

  const isValidRole = (role: string): boolean => {
    if (isLoading || roles.length === 0) return false;
    return roles.some(r => r.name === role);
  };

  const isValidPlan = (plan: string): boolean => {
    if (isLoading || plans.length === 0) return false;
    return plans.some(p => p.name === plan);
  };

  const getRoleNames = (): string[] => {
    return roles.map(role => role.name);
  };

  const getPlanNames = (): string[] => {
    return plans.map(plan => plan.name);
  };

  const getUserRoleByName = (name: string) => {
    return roles.find(role => role.name === name);
  };

  const getSystemPlanByName = (name: string) => {
    return plans.find(plan => plan.name === name);
  };

  return {
    isValidRole,
    isValidPlan,
    getRoleNames,
    getPlanNames,
    getUserRoleByName,
    getSystemPlanByName,
    isLoading
  };
}
