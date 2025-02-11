
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

// Helper function to convert nested path to underscore format
const toUnderscoreFormat = (path: string): string => {
  return path.replace(/\./g, '_');
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
    // Skip preserved array fields
    if (preservedArrayFields.includes(key)) {
      return;
    }

    // Convert key to underscore format for comparison
    const underscoreKey = toUnderscoreFormat(key);
    if (premiumFields.includes(underscoreKey)) {
      console.log(`Decorating premium field: ${key} (${underscoreKey})`);
      (decoratedPolicy[key as keyof PetPolicy] as any) = {
        value: policy[key as keyof PetPolicy],
        isPremiumField: true
      };
    }
  });

  // Initialize size_restrictions if it doesn't exist
  if (!decoratedPolicy.size_restrictions) {
    decoratedPolicy.size_restrictions = {} as SizeRestrictions;
  }

  // Second pass: handle nested objects while preserving structure
  if (isObject(policy.size_restrictions)) {
    const nestedObj: Record<string, any> = {};
    for (const key in policy.size_restrictions) {
      const underscoreKey = `size_restrictions_${key}`;
      if (premiumFields.includes(underscoreKey)) {
        console.log(`Decorating nested premium field: ${underscoreKey}`);
        nestedObj[key] = {
          value: policy.size_restrictions[key as keyof SizeRestrictions],
          isPremiumField: true
        };
      } else {
        nestedObj[key] = policy.size_restrictions[key as keyof SizeRestrictions];
      }
    }
    decoratedPolicy.size_restrictions = nestedObj as SizeRestrictions;
  } else {
    // If size_restrictions doesn't exist or is null, create it with premium fields
    const nestedObj: Record<string, any> = {};
    ['max_weight_cabin', 'max_weight_cargo', 'carrier_dimensions_cabin'].forEach(key => {
      const underscoreKey = `size_restrictions_${key}`;
      if (premiumFields.includes(underscoreKey)) {
        nestedObj[key] = {
          value: null,
          isPremiumField: true
        };
      } else {
        nestedObj[key] = null;
      }
    });
    decoratedPolicy.size_restrictions = nestedObj as SizeRestrictions;
  }

  // Initialize fees if it doesn't exist
  if (!decoratedPolicy.fees) {
    decoratedPolicy.fees = {} as Fees;
  }

  // Handle fees object similarly
  if (isObject(policy.fees)) {
    const nestedObj: Record<string, any> = {};
    for (const key in policy.fees) {
      const underscoreKey = `fees_${key}`;
      if (premiumFields.includes(underscoreKey)) {
        console.log(`Decorating nested premium field: ${underscoreKey}`);
        nestedObj[key] = {
          value: policy.fees[key as keyof Fees],
          isPremiumField: true
        };
      } else {
        nestedObj[key] = policy.fees[key as keyof Fees];
      }
    }
    decoratedPolicy.fees = nestedObj as Fees;
  } else {
    // If fees doesn't exist or is null, create it with premium fields
    const nestedObj: Record<string, any> = {};
    ['in_cabin', 'cargo'].forEach(key => {
      const underscoreKey = `fees_${key}`;
      if (premiumFields.includes(underscoreKey)) {
        nestedObj[key] = {
          value: null,
          isPremiumField: true
        };
      } else {
        nestedObj[key] = null;
      }
    });
    decoratedPolicy.fees = nestedObj as Fees;
  }

  console.log('Decorated policy:', decoratedPolicy);
  return decoratedPolicy as PetPolicy;
};
