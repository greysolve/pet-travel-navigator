
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

const flattenObject = (obj: Record<string, any>, prefix = ''): Record<string, any> => {
  return Object.keys(obj).reduce((acc: Record<string, any>, key: string) => {
    const prefixedKey = prefix ? `${prefix}_${key}` : key;
    
    if (isObject(obj[key]) && !('isPremiumField' in obj[key])) {
      Object.assign(acc, flattenObject(obj[key], prefixedKey));
    } else {
      acc[prefixedKey] = obj[key];
    }
    
    return acc;
  }, {});
};

const unflattenObject = (obj: Record<string, any>): Record<string, any> => {
  const result: Record<string, any> = {};
  
  for (const key in obj) {
    const keys = key.split('_');
    let current = result;
    
    for (let i = 0; i < keys.length; i++) {
      const k = keys[i];
      if (i === keys.length - 1) {
        current[k] = obj[key];
      } else {
        current[k] = current[k] || {};
        current = current[k];
      }
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
  for (const [key, value] of Object.entries(flattenedPolicy)) {
    if (premiumFields.includes(key)) {
      console.log(`[decorateWithPremiumFields] Marking as premium: ${key}`);
      decoratedFlat[key] = {
        value,
        isPremiumField: true
      };
    } else {
      decoratedFlat[key] = value;
    }
  }

  // Unflatten the decorated policy
  const decoratedPolicy = unflattenObject(decoratedFlat);
  console.log('[decorateWithPremiumFields] Final decorated policy:', decoratedPolicy);

  return decoratedPolicy as PetPolicy;
};
