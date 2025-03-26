
import { supabase } from "@/integrations/supabase/client";
import { UserRole, UserPermission, SystemPlan } from "./types";

/**
 * Fetch role permissions from the database
 */
export async function fetchRolePermissions(roleName: UserRole): Promise<UserPermission[]> {
  try {
    const { data, error } = await supabase
      .from('system_roles')
      .select('permissions')
      .eq('name', roleName)
      .single();
    
    if (error) {
      console.error('Error fetching role permissions:', error);
      return [];
    }
    
    return data?.permissions || [];
  } catch (error) {
    console.error('Unexpected error fetching role permissions:', error);
    return [];
  }
}

/**
 * Fetch plan details from the database
 */
export async function fetchPlanDetails(planName: string): Promise<SystemPlan | null> {
  try {
    const { data, error } = await supabase
      .from('system_plans')
      .select('*')
      .eq('name', planName)
      .single();
    
    if (error) {
      console.error('Error fetching plan details:', error);
      return null;
    }
    
    return data as SystemPlan;
  } catch (error) {
    console.error('Unexpected error fetching plan details:', error);
    return null;
  }
}
