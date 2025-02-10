
import type { PetPolicy } from "@/components/flight-results/types";
import { supabase } from "@/integrations/supabase/client";

type PremiumField = {
  value: any;
  isPremiumField: true;
};

let cachedPremiumFields: string[] | null = null;
let cacheExpiry: number | null = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

const getPremiumFields = async (): Promise<string[]> => {
  // Return cached value if valid
  if (cachedPremiumFields && cacheExpiry && Date.now() < cacheExpiry) {
    return cachedPremiumFields;
  }

  const { data, error } = await supabase
    .from('premium_field_settings')
    .select('field_name')
    .eq('is_premium', true);

  if (error) {
    console.error('Error fetching premium fields:', error);
    // Fallback to default fields if there's an error
    return [
      'carrier_requirements',
      'carrier_requirements_cabin',
      'carrier_requirements_cargo',
      'temperature_restrictions',
      'policy_url'
    ];
  }

  // Update cache
  cachedPremiumFields = data.map(field => field.field_name);
  cacheExpiry = Date.now() + CACHE_DURATION;

  return cachedPremiumFields;
};

export const decorateWithPremiumFields = async (policy: Partial<PetPolicy>): Promise<PetPolicy> => {
  const premiumFields = await getPremiumFields();
  const decoratedPolicy = { ...policy };

  // Mark premium fields
  premiumFields.forEach(field => {
    const fieldPath = field.replace(/_/g, '.');
    const value = fieldPath.split('.').reduce((obj: any, key: string) => obj?.[key], policy);
    
    if (value !== undefined) {
      const target = fieldPath.split('.').reduce((obj: any, key: string, index: number, array: string[]) => {
        if (index === array.length - 1) {
          obj[key] = {
            value: value,
            isPremiumField: true
          };
        } else {
          obj[key] = obj[key] || {};
        }
        return obj[key];
      }, decoratedPolicy);
    }
  });

  return {
    ...decoratedPolicy,
    isSummary: true
  } as PetPolicy;
};
