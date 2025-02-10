
import type { PetPolicy } from "@/components/flight-results/types";
import { supabase } from "@/integrations/supabase/client";

type PremiumField = {
  value: any;
  isPremiumField: true;
};

let cachedPremiumFields: string[] | null = null;
let cacheExpiry: number | null = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

const formatFieldPath = (fieldName: string): string[] => {
  // Convert snake_case to nested path
  // e.g., size_restrictions_max_weight_cabin -> ['size_restrictions', 'max_weight_cabin']
  const parts = fieldName.split('_');
  const result: string[] = [];
  
  // Handle special cases for known prefixes
  const knownPrefixes = ['size_restrictions', 'carrier_requirements', 'fees'];
  for (const prefix of knownPrefixes) {
    if (fieldName.startsWith(prefix)) {
      const remaining = fieldName.slice(prefix.length + 1); // +1 for the underscore
      if (remaining) {
        return [prefix, remaining];
      }
      return [prefix];
    }
  }
  
  // Default handling for other fields
  return [fieldName];
};

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
  
  // Create parent objects if they don't exist
  const parent = parentPath.reduce((current, key) => {
    if (!current[key] || typeof current[key] !== 'object') {
      current[key] = {};
    }
    return current[key];
  }, obj);
  
  // Set the value
  parent[lastKey] = value;
};

export const decorateWithPremiumFields = async (policy: Partial<PetPolicy>): Promise<PetPolicy> => {
  console.log('Decorating policy:', policy);
  const premiumFields = await getPremiumFields();
  console.log('Premium fields:', premiumFields);
  
  const decoratedPolicy = { ...policy };

  // Mark premium fields
  for (const fieldName of premiumFields) {
    const path = formatFieldPath(fieldName);
    console.log(`Processing field ${fieldName}, path:`, path);
    
    const value = getNestedValue(policy, path);
    console.log(`Value for ${fieldName}:`, value);
    
    if (value !== undefined) {
      setNestedValue(decoratedPolicy, path, {
        value: value,
        isPremiumField: true
      });
    }
  }

  console.log('Decorated policy:', decoratedPolicy);
  return {
    ...decoratedPolicy,
    isSummary: true
  } as PetPolicy;
};
