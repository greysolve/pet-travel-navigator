
import type { PetPolicy } from "@/components/flight-results/types";

type PremiumField = {
  value: any;
  isPremiumField: true;
};

const isObject = (value: any): value is Record<string, any> => {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
};

// Improved field path formatting
const formatFieldPath = (fieldName: string): string[] => {
  const parts = fieldName.split('_');
  const knownPrefixes = ['size_restrictions', 'carrier_requirements', 'fees'];
  
  // Check if this is a prefix with additional parts
  for (const prefix of knownPrefixes) {
    if (fieldName.startsWith(prefix)) {
      const remaining = fieldName.slice(prefix.length + 1);
      const path = [prefix];
      if (remaining) {
        path.push(remaining);
      }
      return path;
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

// New function to recursively decorate nested objects
const decorateNestedObject = (obj: any, parentPath: string, premiumFields: string[]): any => {
  if (!isObject(obj)) return obj;

  const decoratedObj: any = {};

  for (const [key, value] of Object.entries(obj)) {
    const currentPath = parentPath ? `${parentPath}_${key}` : key;
    
    if (premiumFields.includes(currentPath)) {
      decoratedObj[key] = {
        value: value,
        isPremiumField: true
      };
    } else if (isObject(value)) {
      decoratedObj[key] = decorateNestedObject(value, currentPath, premiumFields);
    } else {
      decoratedObj[key] = value;
    }
  }

  return decoratedObj;
};

export const decorateWithPremiumFields = (
  policy: Partial<PetPolicy>,
  premiumFields: string[]
): PetPolicy => {
  console.log('Decorating policy with premium fields:', { policy, premiumFields });
  
  const decoratedPolicy = { ...policy };

  // Handle top-level premium fields first
  for (const fieldName of premiumFields) {
    const path = formatFieldPath(fieldName);
    console.log(`Processing field ${fieldName}, path:`, path);
    
    if (path.length === 1) {
      const value = getNestedValue(policy, path);
      console.log(`Value for ${fieldName}:`, value);
      
      if (value !== undefined) {
        setNestedValue(decoratedPolicy, path, {
          value: value,
          isPremiumField: true
        });
      }
    }
  }

  // Handle nested premium fields
  const knownPrefixes = ['size_restrictions', 'carrier_requirements', 'fees'];
  for (const prefix of knownPrefixes) {
    if (decoratedPolicy[prefix as keyof PetPolicy]) {
      decoratedPolicy[prefix as keyof PetPolicy] = decorateNestedObject(
        decoratedPolicy[prefix as keyof PetPolicy],
        prefix,
        premiumFields
      );
    }
  }

  console.log('Decorated policy:', decoratedPolicy);
  return {
    ...decoratedPolicy,
    isSummary: true
  } as PetPolicy;
};
