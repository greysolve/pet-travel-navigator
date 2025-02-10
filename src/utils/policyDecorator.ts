
import type { PetPolicy } from "@/components/flight-results/types";

type PremiumContent = {
  value: any;
  isPremiumField: true;
};

type PremiumField<T> = T | PremiumContent;

// Type guard to check if a value is a non-null object
const isObject = (value: any): value is Record<string, any> => {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
};

// Helper type for nested objects
type SizeRestrictions = {
  max_weight_cabin?: string;
  max_weight_cargo?: string;
  carrier_dimensions_cabin?: string;
};

type Fees = {
  in_cabin?: string;
  cargo?: string;
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
    const nestedValue = decoratedPolicy[objField];
    if (isObject(nestedValue)) {
      const nestedObj: Record<string, any> = {};
      
      // Copy existing properties
      for (const propKey in nestedValue) {
        const fullPath = `${objField}_${propKey}`;
        if (premiumFields.includes(fullPath)) {
          nestedObj[propKey] = {
            value: nestedValue[propKey],
            isPremiumField: true
          };
        } else {
          nestedObj[propKey] = nestedValue[propKey];
        }
      }
      
      if (objField === 'size_restrictions') {
        decoratedPolicy.size_restrictions = nestedObj as SizeRestrictions;
      } else if (objField === 'fees') {
        decoratedPolicy.fees = nestedObj as Fees;
      } else {
        decoratedPolicy.carrier_requirements = nestedObj as string;
      }
    }
  }

  console.log('Decorated policy:', decoratedPolicy);
  return {
    ...decoratedPolicy,
    isSummary: true
  } as PetPolicy;
};
