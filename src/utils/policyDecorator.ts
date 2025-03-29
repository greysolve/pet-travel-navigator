
import type { PetPolicy, SizeRestrictions, Fees } from "@/components/flight-results/types";

type PremiumContent = {
  value: any;
  isPremiumField: true;
};

type PremiumField<T> = T | PremiumContent;

// Type guard to check if a value is a non-null object
const isObject = (value: any): value is Record<string, any> => {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
};

// Update PetPolicy to handle premium fields
type DecoratedPetPolicy = Omit<PetPolicy, 'carrier_requirements'> & {
  carrier_requirements?: PremiumField<string>;
};

// Helper function to convert field name to standardized format
const normalizeFieldName = (path: string): string => {
  return path.trim().toLowerCase().replace(/[.-]/g, '_');
};

export const decorateWithPremiumFields = (
  policy: Partial<PetPolicy>,
  premiumFields: string[]
): PetPolicy => {
  console.log('Raw policy data:', policy);
  console.log('Premium fields:', premiumFields);
  
  // Normalize premium field names for case-insensitive matching
  const normalizedPremiumFields = premiumFields.map(normalizeFieldName);
  console.log('Normalized premium fields:', normalizedPremiumFields);
  
  const decoratedPolicy = { ...policy } as DecoratedPetPolicy;
  
  // Process all fields based solely on database configuration
  Object.keys(policy).forEach(key => {
    // Normalize key for comparison
    const normalizedKey = normalizeFieldName(key);
    console.log(`Checking field: ${key} (normalized: ${normalizedKey})`);
    
    if (normalizedPremiumFields.includes(normalizedKey)) {
      console.log(`Decorating premium field: ${key} (${normalizedKey})`);
      (decoratedPolicy[key as keyof PetPolicy] as any) = {
        value: policy[key as keyof PetPolicy],
        isPremiumField: true
      };
    }
  });

  // Handle size_restrictions field
  if (typeof policy.size_restrictions === 'string') {
    // If size_restrictions is a string and is a premium field, wrap it
    const normalizedKey = normalizeFieldName('size_restrictions');
    if (normalizedPremiumFields.includes(normalizedKey)) {
      decoratedPolicy.size_restrictions = {
        value: policy.size_restrictions,
        isPremiumField: true
      };
    } else {
      decoratedPolicy.size_restrictions = policy.size_restrictions;
    }
  } else if (isObject(policy.size_restrictions)) {
    // Handle nested object while preserving structure
    const nestedObj: Record<string, any> = {};
    for (const key in policy.size_restrictions) {
      const normalizedNestedKey = normalizeFieldName(`size_restrictions_${key}`);
      console.log(`Checking nested field: size_restrictions.${key} (normalized: ${normalizedNestedKey})`);
      
      if (normalizedPremiumFields.includes(normalizedNestedKey)) {
        console.log(`Decorating nested premium field: ${normalizedNestedKey}`);
        nestedObj[key] = {
          value: policy.size_restrictions[key as keyof SizeRestrictions],
          isPremiumField: true
        };
      } else {
        nestedObj[key] = policy.size_restrictions[key as keyof SizeRestrictions];
      }
    }
    decoratedPolicy.size_restrictions = nestedObj as SizeRestrictions;
  } else if (policy.size_restrictions === null || policy.size_restrictions === undefined) {
    // If size_restrictions doesn't exist or is null, create it with premium fields
    const nestedObj: Record<string, any> = {};
    ['max_weight_cabin', 'max_weight_cargo', 'carrier_dimensions_cabin'].forEach(key => {
      const normalizedNestedKey = normalizeFieldName(`size_restrictions_${key}`);
      if (normalizedPremiumFields.includes(normalizedNestedKey)) {
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

  // Handle fees field similarly
  if (typeof policy.fees === 'string') {
    // If fees is a string and is a premium field, wrap it
    const normalizedKey = normalizeFieldName('fees');
    if (normalizedPremiumFields.includes(normalizedKey)) {
      decoratedPolicy.fees = {
        value: policy.fees,
        isPremiumField: true
      };
    } else {
      decoratedPolicy.fees = policy.fees;
    }
  } else if (isObject(policy.fees)) {
    // Handle nested object while preserving structure
    const nestedObj: Record<string, any> = {};
    for (const key in policy.fees) {
      const normalizedNestedKey = normalizeFieldName(`fees_${key}`);
      console.log(`Checking nested field: fees.${key} (normalized: ${normalizedNestedKey})`);
      
      if (normalizedPremiumFields.includes(normalizedNestedKey)) {
        console.log(`Decorating nested premium field: ${normalizedNestedKey}`);
        nestedObj[key] = {
          value: policy.fees[key as keyof Fees],
          isPremiumField: true
        };
      } else {
        nestedObj[key] = policy.fees[key as keyof Fees];
      }
    }
    decoratedPolicy.fees = nestedObj as Fees;
  } else if (policy.fees === null || policy.fees === undefined) {
    // If fees doesn't exist or is null, create it with premium fields
    const nestedObj: Record<string, any> = {};
    ['in_cabin', 'cargo'].forEach(key => {
      const normalizedNestedKey = normalizeFieldName(`fees_${key}`);
      if (normalizedPremiumFields.includes(normalizedNestedKey)) {
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

  // Log the final decorated policy for debugging
  console.log('Decorated policy:', decoratedPolicy);
  return decoratedPolicy as PetPolicy;
};
