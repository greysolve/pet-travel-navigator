
import type { PetPolicy } from "@/components/flight-results/types";

type PremiumContent = {
  value: any;
  isPremiumField: true;
};

type PremiumField<T> = T | PremiumContent;

const isObject = (value: any): value is Record<string, any> => {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
};

type SizeRestrictions = {
  max_weight_cabin?: string;
  max_weight_cargo?: string;
  carrier_dimensions_cabin?: string;
};

type Fees = {
  in_cabin?: string;
  cargo?: string;
};

type DecoratedPetPolicy = Omit<PetPolicy, 'carrier_requirements'> & {
  carrier_requirements?: PremiumField<string>;
};

export const decorateWithPremiumFields = (
  policy: Partial<PetPolicy>,
  premiumFields: string[]
): PetPolicy => {
  console.log('[decorateWithPremiumFields] Input:', { 
    policy,
    premiumFields,
    policyKeys: Object.keys(policy)
  });
  
  const decoratedPolicy = { ...policy } as DecoratedPetPolicy;
  
  // First pass: handle all direct premium fields
  console.log('[decorateWithPremiumFields] Starting first pass for direct fields');
  for (const fieldName of premiumFields) {
    const value = policy[fieldName as keyof PetPolicy];
    if (value !== undefined) {
      console.log(`[decorateWithPremiumFields] Marking direct field as premium: ${fieldName}`, { value });
      (decoratedPolicy[fieldName as keyof PetPolicy] as any) = {
        value,
        isPremiumField: true
      };
    }
  }
  console.log('[decorateWithPremiumFields] After first pass:', decoratedPolicy);

  // Second pass: handle nested objects
  console.log('[decorateWithPremiumFields] Starting second pass for nested objects');
  if (isObject(policy.size_restrictions)) {
    const nestedObj: Record<string, any> = {};
    for (const propKey in policy.size_restrictions) {
      const fullPath = `size_restrictions_${propKey}`;
      if (premiumFields.includes(fullPath)) {
        console.log(`[decorateWithPremiumFields] Marking nested size restriction as premium: ${fullPath}`);
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
        console.log(`[decorateWithPremiumFields] Marking nested fee as premium: ${fullPath}`);
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

  // Handle carrier_requirements as a premium field
  if (premiumFields.includes('carrier_requirements') && policy.carrier_requirements) {
    console.log('[decorateWithPremiumFields] Marking carrier_requirements as premium');
    decoratedPolicy.carrier_requirements = {
      value: policy.carrier_requirements,
      isPremiumField: true
    };
  }

  console.log('[decorateWithPremiumFields] Final decorated policy:', decoratedPolicy);
  return {
    ...decoratedPolicy,
    isSummary: true
  } as unknown as PetPolicy;
};
