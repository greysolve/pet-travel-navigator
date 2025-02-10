
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

// Update PetPolicy to handle premium fields
type DecoratedPetPolicy = Omit<PetPolicy, 'carrier_requirements'> & {
  carrier_requirements?: PremiumField<string>;
};

export const decorateWithPremiumFields = (
  policy: Partial<PetPolicy>,
  premiumFields: string[]
): PetPolicy => {
  console.log('Raw policy data:', policy);
  console.log('Premium fields:', premiumFields);
  
  const decoratedPolicy = { ...policy } as DecoratedPetPolicy;
  
  // Always preserve these fields as non-premium arrays
  const preservedArrayFields = ['pet_types_allowed', 'documentation_needed', 'breed_restrictions'];
  
  // First pass: handle all direct premium fields
  Object.keys(policy).forEach(key => {
    // Skip null/undefined values and preserved array fields
    if (policy[key as keyof PetPolicy] === undefined || preservedArrayFields.includes(key)) {
      return;
    }

    if (premiumFields.includes(key)) {
      console.log(`Decorating premium field: ${key}`);
      (decoratedPolicy[key as keyof PetPolicy] as any) = {
        value: policy[key as keyof PetPolicy],
        isPremiumField: true
      };
    }
  });

  // Second pass: handle nested objects while preserving structure
  if (isObject(policy.size_restrictions)) {
    const nestedObj: Record<string, any> = {};
    for (const key in policy.size_restrictions) {
      const fullPath = `size_restrictions.${key}`;
      if (premiumFields.includes(fullPath)) {
        console.log(`Decorating nested premium field: ${fullPath}`);
        nestedObj[key] = {
          value: policy.size_restrictions[key as keyof SizeRestrictions],
          isPremiumField: true
        };
      } else {
        nestedObj[key] = policy.size_restrictions[key as keyof SizeRestrictions];
      }
    }
    decoratedPolicy.size_restrictions = nestedObj as SizeRestrictions;
  }

  if (isObject(policy.fees)) {
    const nestedObj: Record<string, any> = {};
    for (const key in policy.fees) {
      const fullPath = `fees.${key}`;
      if (premiumFields.includes(fullPath)) {
        console.log(`Decorating nested premium field: ${fullPath}`);
        nestedObj[key] = {
          value: policy.fees[key as keyof Fees],
          isPremiumField: true
        };
      } else {
        nestedObj[key] = policy.fees[key as keyof Fees];
      }
    }
    decoratedPolicy.fees = nestedObj as Fees;
  }

  console.log('Decorated policy:', decoratedPolicy);
  return decoratedPolicy as PetPolicy;
};
