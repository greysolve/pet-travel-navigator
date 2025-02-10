
import type { PetPolicy } from "@/components/flight-results/types";

type PremiumContent = {
  value: any;
  isPremiumField: true;
};

type PremiumField<T> = T | PremiumContent;

const isObject = (value: any): value is Record<string, any> => {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
};

type DecoratedPetPolicy = {
  [K in keyof PetPolicy]: PremiumField<PetPolicy[K]>;
};

const flattenObject = (obj: Record<string, any>, parentKey = ''): Record<string, any> => {
  return Object.keys(obj).reduce((acc: Record<string, any>, key: string) => {
    const value = obj[key];
    const finalKey = parentKey ? `${parentKey}_${key}` : key;
    
    if (isObject(value) && !('isPremiumField' in value)) {
      // For nested objects, recursively flatten
      Object.assign(acc, flattenObject(value, finalKey));
    } else if (Array.isArray(value)) {
      // Preserve arrays as is
      acc[finalKey] = value;
    } else {
      // Handle primitive values and null/undefined
      acc[finalKey] = value;
    }
    
    return acc;
  }, {});
};

const unflattenObject = (obj: Record<string, any>): Record<string, any> => {
  const result: Record<string, any> = {};

  for (const key in obj) {
    const value = obj[key];
    const parts = key.split('_');
    
    if (parts.length === 1) {
      // Handle top-level fields (including arrays and primitives)
      result[key] = value;
      continue;
    }

    // Handle nested structures
    const mainKey = parts[0];
    const nestedKey = parts.slice(1).join('_');

    if (mainKey === 'fees') {
      result.fees = result.fees || {};
      if (parts[1] === 'in' && parts[2] === 'cabin') {
        result.fees.in_cabin = value;
      } else {
        result.fees[parts[1]] = value;
      }
    } else if (mainKey === 'size_restrictions') {
      result.size_restrictions = result.size_restrictions || {};
      result.size_restrictions[nestedKey] = value;
    } else {
      result[mainKey] = value;
    }
  }
  
  return result;
};

export const decorateWithPremiumFields = (
  policy: Partial<PetPolicy>,
  premiumFields: string[]
): PetPolicy => {
  console.log('[decorateWithPremiumFields] Starting decoration with:', { 
    policy,
    premiumFields
  });

  // Flatten the policy object
  const flattenedPolicy = flattenObject(policy);
  console.log('[decorateWithPremiumFields] Flattened policy:', flattenedPolicy);

  // Decorate premium fields
  const decoratedFlat: Record<string, any> = {};
  
  // Process each field, preserving arrays and handling premium fields
  for (const [key, value] of Object.entries(flattenedPolicy)) {
    // Check if this field should be premium
    if (premiumFields.includes(key)) {
      console.log(`[decorateWithPremiumFields] Marking as premium: ${key}`);
      decoratedFlat[key] = {
        value: value, // Don't use nullish coalescing here to preserve empty arrays
        isPremiumField: true
      };
    } else {
      // For non-premium fields, preserve arrays and other values as is
      decoratedFlat[key] = value;
    }
  }

  // Unflatten the decorated policy
  const decoratedPolicy = unflattenObject(decoratedFlat);
  console.log('[decorateWithPremiumFields] Final decorated policy:', decoratedPolicy);

  return decoratedPolicy as PetPolicy;
};
