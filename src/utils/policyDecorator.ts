
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

// Helper types for nested objects
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
  if (isObject(policy.size_restrictions)) {
    const nestedObj: Record<string, any> = {};
    for (const propKey in policy.size_restrictions) {
      const fullPath = `size_restrictions_${propKey}`;
      if (premiumFields.includes(fullPath)) {
        nestedObj[propKey] = {
          value: policy.size_restrictions[propKey as keyof SizeRestrictions],
          isPremiumField: true
        };
      } else {
        nestedObj[propKey] = policy.size_restrictions[propKey as keyof SizeRestrictions];
      }
    }
    decoratedPolicy.size_restrictions = nestedObj as SizeRestrictions;
  }

  if (isObject(policy.fees)) {
    const nestedObj: Record<string, any> = {};
    for (const propKey in policy.fees) {
      const fullPath = `fees_${propKey}`;
      if (premiumFields.includes(fullPath)) {
        nestedObj[propKey] = {
          value: policy.fees[propKey as keyof Fees],
          isPremiumField: true
        };
      } else {
        nestedObj[propKey] = policy.fees[propKey as keyof Fees];
      }
    }
    decoratedPolicy.fees = nestedObj as Fees;
  }

  // Handle carrier_requirements as a string field
  if (premiumFields.includes('carrier_requirements') && policy.carrier_requirements) {
    decoratedPolicy.carrier_requirements = {
      value: policy.carrier_requirements,
      isPremiumField: true
    };
  }

  console.log('Decorated policy:', decoratedPolicy);
  return {
    ...decoratedPolicy,
    isSummary: true
  } as PetPolicy;
};
