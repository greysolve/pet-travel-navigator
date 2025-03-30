
import { useDynamicTypes } from "@/hooks/useDynamicTypes";

// Get the appropriate badge color for the user role
export const getRoleBadgeColor = (role: string | undefined): string => {
  if (!role) return "bg-gray-400";
  
  switch (role) {
    case "site_manager":
      return "bg-purple-600";
    case "pet_caddie":
      return "bg-blue-500";
    case "admin":
      return "bg-amber-500";
    default:
      return "bg-gray-400";
  }
};

// Get the appropriate badge color for the subscription plan
export const getPlanBadgeColor = (plan: string | undefined): string => {
  if (!plan) return "bg-gray-400";
  
  switch (plan) {
    case "free":
      return "bg-gray-500";
    case "personal":
      return "bg-green-500";
    case "premium":
      return "bg-amber-500";
    case "teams":
      return "bg-blue-600";
    default:
      return "bg-gray-400";
  }
};

// Hook to get dynamic utility functions
export const useDynamicUserUtils = () => {
  const { getUserRoleByName, getSystemPlanByName } = useDynamicTypes();
  
  const getRoleBadgeColorDynamic = (roleName: string | undefined): string => {
    if (!roleName) return "bg-gray-400";
    const role = getUserRoleByName(roleName);
    
    // Fall back to static utility if role not found
    if (!role) return getRoleBadgeColor(roleName);
    
    // Add custom logic here if needed based on role properties
    return getRoleBadgeColor(roleName);
  };
  
  const getPlanBadgeColorDynamic = (planName: string | undefined): string => {
    if (!planName) return "bg-gray-400";
    const plan = getSystemPlanByName(planName);
    
    // Fall back to static utility if plan not found
    if (!plan) return getPlanBadgeColor(planName);
    
    // Add custom logic here if needed based on plan properties
    return getPlanBadgeColor(planName);
  };
  
  return {
    getRoleBadgeColor: getRoleBadgeColorDynamic,
    getPlanBadgeColor: getPlanBadgeColorDynamic
  };
};
