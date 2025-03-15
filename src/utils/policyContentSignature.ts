
import type { PetPolicy } from "@/components/flight-results/types";

/**
 * Generates a content signature for a pet policy to detect changes
 * even when timestamps don't indicate an update
 * 
 * @param policy The pet policy to generate a signature for
 * @returns A string signature that can be compared to detect changes
 */
export const generatePolicyContentSignature = (policy: PetPolicy): string => {
  if (!policy) return '';
  
  // Extract relevant fields for comparison
  const relevantFields = {
    pet_types_allowed: policy.pet_types_allowed,
    size_restrictions: policy.size_restrictions,
    documentation_needed: policy.documentation_needed,
    fees: policy.fees,
    breed_restrictions: policy.breed_restrictions,
    carrier_requirements: policy.carrier_requirements,
    carrier_requirements_cabin: policy.carrier_requirements_cabin,
    carrier_requirements_cargo: policy.carrier_requirements_cargo,
    temperature_restrictions: policy.temperature_restrictions,
    policy_url: typeof policy.policy_url === 'string' ? policy.policy_url : null
  };
  
  // Create a stable string representation by sorting keys
  return JSON.stringify(relevantFields, Object.keys(relevantFields).sort());
};

/**
 * Compares two pet policies for content changes
 * 
 * @param oldPolicy The previous pet policy
 * @param newPolicy The new pet policy
 * @returns true if content has changed, false if identical
 */
export const hasPolicyContentChanged = (oldPolicy: PetPolicy | null, newPolicy: PetPolicy | null): boolean => {
  if (!oldPolicy && !newPolicy) return false;
  if (!oldPolicy || !newPolicy) return true;
  
  const oldSignature = generatePolicyContentSignature(oldPolicy);
  const newSignature = generatePolicyContentSignature(newPolicy);
  
  return oldSignature !== newSignature;
};
