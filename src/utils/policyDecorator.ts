
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
      Object.assign(acc, flattenObject(value, finalKey));
    } else {
      acc[finalKey] = value;
    }
    
    return acc;
  }, {});
};

const unflattenObject = (obj: Record<string, any>): Record<string, any> => {
  const result: Record<string, any> = {};

  for (const key in obj) {
    const parts = key.split('_');
    const mainKey = parts[0];
    
    if (parts.length === 1) {
      result[key] = obj[key];
      continue;
    }

    if (mainKey === 'fees') {
      result.fees = result.fees || {};
      if (parts[1] === 'in' && parts[2] === 'cabin') {
        result.fees.in_cabin = obj[key];
      } else {
        result.fees[parts[1]] = obj[key];
      }
    } else if (mainKey === 'size_restrictions') {
      result.size_restrictions = result.size_restrictions || {};
      const fieldName = parts.slice(1).join('_');
      result.size_restrictions[fieldName] = obj[key];
    } else {
      result[mainKey] = obj[key];
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
  
  // Process each field, preserving all values including empty strings
  for (const [key, value] of Object.entries(flattenedPolicy)) {
    if (premiumFields.includes(key)) {
      console.log(`[decorateWithPremiumFields] Marking as premium: ${key}`);
      decoratedFlat[key] = {
        value: value ?? null, // Preserve null/undefined as null
        isPremiumField: true
      };
    } else {
      decoratedFlat[key] = value ?? null; // Preserve null/undefined as null
    }
  }

  // Unflatten the decorated policy
  const decoratedPolicy = unflattenObject(decoratedFlat);
  console.log('[decorateWithPremiumFields] Final decorated policy:', decoratedPolicy);

  return decoratedPolicy as PetPolicy;
};
