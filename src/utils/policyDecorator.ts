
import type { PetPolicy } from "@/components/flight-results/types";

type PremiumField = {
  value: any;
  isPremiumField: true;
};

const formatFieldPath = (fieldName: string): string[] => {
  const parts = fieldName.split('_');
  const result: string[] = [];
  
  const knownPrefixes = ['size_restrictions', 'carrier_requirements', 'fees'];
  for (const prefix of knownPrefixes) {
    if (fieldName.startsWith(prefix)) {
      const remaining = fieldName.slice(prefix.length + 1);
      if (remaining) {
        return [prefix, remaining];
      }
      return [prefix];
    }
  }
  
  return [fieldName];
};

const getNestedValue = (obj: any, path: string[]): any => {
  return path.reduce((current, key) => current?.[key], obj);
};

const setNestedValue = (obj: any, path: string[], value: any): void => {
  const lastKey = path[path.length - 1];
  const parentPath = path.slice(0, -1);
  
  const parent = parentPath.reduce((current, key) => {
    if (!current[key] || typeof current[key] !== 'object') {
      current[key] = {};
    }
    return current[key];
  }, obj);
  
  parent[lastKey] = value;
};

export const decorateWithPremiumFields = (
  policy: Partial<PetPolicy>,
  premiumFields: string[]
): PetPolicy => {
  console.log('Decorating policy with premium fields:', { policy, premiumFields });
  
  const decoratedPolicy = { ...policy };

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
