
import type { PetPolicy } from "@/components/flight-results/types";
import { supabase } from "@/integrations/supabase/client";

type PremiumField = {
  value: any;
  isPremiumField: true;
};

let cachedPremiumFields: string[] | null = null;
let cacheExpiry: number | null = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

const getPremiumFields = async (): Promise<string[]> => {
  // Return cached value if valid
  if (cachedPremiumFields && cacheExpiry && Date.now() < cacheExpiry) {
    return cachedPremiumFields;
  }

  const { data, error } = await supabase
    .from('premium_field_settings')
    .select('field_name')
    .eq('is_premium', true);

  if (error) {
    console.error('Error fetching premium fields:', error);
    return [];
  }

  // Update cache
  cachedPremiumFields = data.map(field => field.field_name);
  cacheExpiry = Date.now() + CACHE_DURATION;

  return cachedPremiumFields;
};

const getNestedValue = (obj: any, path: string[]): any => {
  return path.reduce((current, key) => current?.[key], obj);
};

const setNestedValue = (obj: any, path: string[], value: any): void => {
  const lastKey = path[path.length - 1];
  const parentPath = path.slice(0, -1);
  const parent = parentPath.reduce((current, key) => {
    current[key] = current[key] || {};
    return current[key];
  }, obj);
  parent[lastKey] = value;
};

export const decorateWithPremiumFields = async (policy: Partial<PetPolicy>): Promise<PetPolicy> => {
  const premiumFields = await getPremiumFields();
  const decoratedPolicy = { ...policy };

  // Mark premium fields
  premiumFields.forEach(fieldName => {
    const paths = fieldName.split('_');
    const value = getNestedValue(policy, paths);
    
    if (value !== undefined) {
      setNestedValue(decoratedPolicy, paths, {
        value: value,
        isPremiumField: true
      });
    }
  });

  return {
    ...decoratedPolicy,
    isSummary: true
  } as PetPolicy;
};
