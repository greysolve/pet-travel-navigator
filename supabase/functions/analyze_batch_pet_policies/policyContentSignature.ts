
/**
 * Generates a content signature for a pet policy to detect changes
 * even when timestamps don't indicate an update
 * 
 * @param policy The pet policy to generate a signature for
 * @returns A string signature that can be compared to detect changes
 */
export const generatePolicyContentSignature = (policy: any): string => {
  if (!policy) return '';
  
  // Normalize URLs (if any) to ensure consistent comparison
  const normalizeUrl = (url: string | null | undefined): string | null => {
    if (!url) return null;
    
    try {
      // Remove any trailing slashes and force to lowercase for comparison
      const normalizedUrl = url.trim().toLowerCase().replace(/\/+$/, '');
      return normalizedUrl;
    } catch (e) {
      console.error('Error normalizing URL:', e);
      return url; // Return original if normalization fails
    }
  };
  
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
    policy_url: normalizeUrl(policy.policy_url)
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
export const hasPolicyContentChanged = (oldPolicy: any | null, newPolicy: any | null): boolean => {
  if (!oldPolicy && !newPolicy) return false;
  if (!oldPolicy || !newPolicy) return true;
  
  // Log for debugging
  console.log(`Comparing old policy URL: ${oldPolicy.policy_url || 'none'}`);
  console.log(`with new policy URL: ${newPolicy.policy_url || 'none'}`);
  
  const oldSignature = generatePolicyContentSignature(oldPolicy);
  const newSignature = generatePolicyContentSignature(newPolicy);
  
  // Log signatures for debugging
  console.log(`Old signature: ${oldSignature.substring(0, 100)}...`);
  console.log(`New signature: ${newSignature.substring(0, 100)}...`);
  
  return oldSignature !== newSignature;
};
