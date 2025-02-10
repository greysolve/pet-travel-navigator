
import type { PetPolicy } from "@/components/flight-results/types";

const SHOW_PREMIUM_FEATURES = import.meta.env.VITE_SHOW_PREMIUM_FEATURES === 'true';

export const decorateWithPremiumFields = (summary: Partial<PetPolicy>): PetPolicy => {
  if (!SHOW_PREMIUM_FEATURES) {
    return { 
      ...summary,
      isSummary: true
    } as PetPolicy;
  }

  // Add premium field placeholders with null values
  return {
    ...summary,
    isSummary: true,
    carrier_requirements: null,
    carrier_requirements_cabin: null,
    carrier_requirements_cargo: null,
    temperature_restrictions: null,
    policy_url: null
  } as PetPolicy;
};
