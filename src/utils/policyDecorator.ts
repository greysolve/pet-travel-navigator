
import type { PetPolicy } from "@/components/flight-results/types";

type PremiumContent = {
  value: any;
  isPremiumField: true;
};

type PremiumField<T> = T | PremiumContent;

const isObject = (value: any): value is Record<string, any> => {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
};

const formatFieldPath = (fieldName: string): string[] => {
  return [fieldName]; // Return exact field name as single element array
};

export const decorateWithPremiumFields = (
  policy: Partial<PetPolicy>,
  premiumFields: string[]
): PetPolicy => {
  console.log('Decorating policy with premium fields:', { policy, premiumFields });
  
  const decoratedPolicy = { ...policy } as PetPolicy;
  
  // First pass: handle all direct premium fields
  for (const fieldName of premiumFields) {
    const value = policy[fieldName as keyof PetPolicy];
    if (value !== undefined) {
      (decoratedPolicy[fieldName as keyof PetPolicy] as any) = {
        value,
        isPremiumField: true
      };
    }
  }

  // Second pass: handle nested objects
  const objectFields = ['size_restrictions', 'carrier_requirements', 'fees'] as const;
  for (const objField of objectFields) {
    if (decoratedPolicy[objField]) {
      const nestedObj = { ...decoratedPolicy[objField] };
      
      // Check each property in nested object
      for (const propKey in nestedObj) {
        const fullPath = `${objField}_${propKey}`;
        if (premiumFields.includes(fullPath)) {
          nestedObj[propKey] = {
            value: nestedObj[propKey],
            isPremiumField: true
          };
        }
      }
      
      decoratedPolicy[objField] = nestedObj;
    }
  }

  console.log('Decorated policy:', decoratedPolicy);
  return {
    ...decoratedPolicy,
    isSummary: true
  } as PetPolicy;
};
