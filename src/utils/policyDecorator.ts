
import type { PetPolicy } from "@/components/flight-results/types";

type PremiumField = {
  value: any;
  isPremiumField: true;
};

export const decorateWithPremiumFields = (policy: Partial<PetPolicy>): PetPolicy => {
  const premiumFields = [
    'carrier_requirements',
    'carrier_requirements_cabin',
    'carrier_requirements_cargo',
    'temperature_restrictions',
    'policy_url'
  ];

  const decoratedPolicy = { ...policy };

  // Mark premium fields
  premiumFields.forEach(field => {
    if (policy[field as keyof PetPolicy] !== undefined) {
      (decoratedPolicy[field as keyof PetPolicy] as PremiumField) = {
        value: policy[field as keyof PetPolicy],
        isPremiumField: true
      };
    }
  });

  return {
    ...decoratedPolicy,
    isSummary: true
  } as PetPolicy;
};
