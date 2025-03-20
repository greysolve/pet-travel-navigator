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
      // Remove any trailing slashes, query parameters, and force to lowercase for comparison
      const urlObj = new URL(url.trim());
      
      // Keep only hostname and pathname (no query parameters or hash)
      let normalizedUrl = `${urlObj.protocol}//${urlObj.hostname}${urlObj.pathname}`.toLowerCase();
      
      // Remove trailing slashes
      normalizedUrl = normalizedUrl.replace(/\/+$/, '');
      
      console.log(`Normalized URL from "${url}" to "${normalizedUrl}"`);
      return normalizedUrl;
    } catch (e) {
      console.error('Error normalizing URL:', e);
      
      // If URL parsing fails (e.g., not a valid URL), just do basic normalization
      const basicNormalized = url.trim().toLowerCase().replace(/\/+$/, '');
      console.log(`Basic URL normalization from "${url}" to "${basicNormalized}"`);
      return basicNormalized;
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
  
  // Check URL changes directly for more detailed logging
  const oldUrl = oldPolicy.policy_url;
  const newUrl = newPolicy.policy_url;
  
  if (oldUrl !== newUrl) {
    console.log(`URL change detected from "${oldUrl}" to "${newUrl}"`);
  }
  
  const oldSignature = generatePolicyContentSignature(oldPolicy);
  const newSignature = generatePolicyContentSignature(newPolicy);
  
  // Log signatures for debugging
  console.log(`Old signature: ${oldSignature.substring(0, 100)}...`);
  console.log(`New signature: ${newSignature.substring(0, 100)}...`);
  
  return oldSignature !== newSignature;
};
