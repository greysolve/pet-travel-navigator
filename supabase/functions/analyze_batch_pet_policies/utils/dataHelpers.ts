
/**
 * Helper utilities for processing and normalizing API data
 */

/**
 * Ensures a value is converted to an array
 * Handles different data formats (string, object, array)
 */
export const ensureArray = (value: any): string[] => {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') return [value];
  if (typeof value === 'object') {
    // For objects like { restrictions: "Pit Bull breed dogs are not allowed" }
    // Convert to array of values
    return Object.values(value).map(v => v.toString());
  }
  return [value.toString()];
};

/**
 * Detects if a string response indicates that no pet policy was found
 * Returns true if the response appears to be a natural language "no policy" response
 */
const isNoPolicyResponse = (content: string): boolean => {
  const noPolicyPhrases = [
    "does not provide specific information",
    "does not have a specific pet policy",
    "does not have a dedicated pet policy",
    "lacks a dedicated pet policy page",
    "could not find specific information",
    "no specific pet policy",
    "no detailed pet policy",
    "no publicly available pet policy",
    "no official pet policy",
    "information is not available",
    "pet policy is not available",
    "policy is not publicly available",
    "not available on their website",
    "contact the airline directly",
    "contact customer service",
    "check with the airline"
  ];
  
  const contentLower = content.toLowerCase();
  
  // Check if any of the "no policy" phrases appear in the content
  return noPolicyPhrases.some(phrase => contentLower.includes(phrase.toLowerCase()));
};

/**
 * Creates a standardized "no policy found" object
 */
const createNoPolicyObject = (): any => {
  return {
    airline_info: {
      official_website: "Not specified",
      pet_policy_url: "Not specified"
    },
    pet_policy: {
      allowed_pets: ["Not specified"],
      size_weight_restrictions: "Contact airline for details",
      carrier_requirements: {
        in_cabin: "Contact airline for details",
        cargo: "Contact airline for details"
      },
      documentation_needed: ["Contact airline for details"],
      fees: {
        in_cabin: "Contact airline for details",
        cargo: "Contact airline for details"
      },
      temperature_breed_restrictions: {
        temperature: "Contact airline for details",
        breed: ["Contact airline for details"]
      },
      policy_url: "Not specified",
      policy_found: false
    }
  };
};

/**
 * Attempts to parse JSON content using multiple strategies
 */
export const parseJsonContent = (content: string): any => {
  // First check if this appears to be a natural language "no policy found" response
  if (isNoPolicyResponse(content)) {
    console.log('Detected natural language "no policy found" response, creating standardized response object');
    return createNoPolicyObject();
  }
  
  // Step 1: Try parsing the content as-is first
  try {
    return JSON.parse(content);
  } catch (initialParseError) {
    console.warn('Initial direct JSON parse failed, trying with cleanup steps');
    
    // Step 2: Clean the content of common formatting issues
    const basicCleanContent = content
      .replace(/```json\n?|\n?```/g, '')  // Remove markdown code blocks
      .replace(/^\s*\{/, '{')             // Fix leading whitespace before opening brace
      .replace(/\}\s*$/, '}')             // Fix trailing whitespace after closing brace
      .trim();
      
    try {
      return JSON.parse(basicCleanContent);
    } catch (basicCleanError) {
      console.warn('Basic cleaned JSON parse failed, attempting advanced cleanup');
      
      // Step 3: More aggressive cleanup for difficult cases
      const advancedCleanContent = basicCleanContent
        .replace(/\\"/g, '"')              // Replace escaped quotes
        .replace(/\\\\/g, '\\')            // Replace double backslashes
        .replace(/\n/g, ' ')               // Replace newlines with spaces
        .replace(/,\s*\}/g, '}')           // Remove trailing commas
        .replace(/,\s*\]/g, ']')           // Remove trailing commas in arrays
        .trim();
        
      try {
        return JSON.parse(advancedCleanContent);
      } catch (advancedCleanError) {
        console.error('All JSON parsing attempts failed');
        
        // Step 4: Try to extract JSON from the text using regex as a last resort
        const jsonPattern = /\{[\s\S]*\}/g;
        const match = content.match(jsonPattern);
        
        if (match) {
          try {
            return JSON.parse(match[0]);
          } catch (regexError) {
            // After all parsing strategies have failed, check if this is a natural language "no policy found" response
            if (isNoPolicyResponse(content)) {
              console.log('Detected natural language "no policy found" response after parsing failure, creating standardized response object');
              return createNoPolicyObject();
            }
            throw new Error('Failed to parse content as JSON after all attempts');
          }
        } else {
          // After failing to find JSON pattern, check if this is a natural language "no policy found" response
          if (isNoPolicyResponse(content)) {
            console.log('Detected natural language "no policy found" response after pattern matching failure, creating standardized response object');
            return createNoPolicyObject();
          }
          throw new Error('Could not locate JSON pattern in content');
        }
      }
    }
  }
};

/**
 * Normalizes the parsed pet policy data into a consistent structure
 */
export const normalizePetPolicyData = (parsedData: any, rawResponse: string): any => {
  const airlineInfo = parsedData.airline_info || {};
  const petPolicy = parsedData.pet_policy || {};
  
  // Check if this was a "no policy found" response
  const isNoPolicyResult = petPolicy.policy_found === false;
  
  // Combine the data into a normalized object with our expected field structure
  return {
    // Extract specific fields from pet_policy
    pet_types_allowed: ensureArray(petPolicy.allowed_pets || {}),
    size_restrictions: petPolicy.size_weight_restrictions || {},
    carrier_requirements_cabin: petPolicy.carrier_requirements?.in_cabin || {},
    carrier_requirements_cargo: petPolicy.carrier_requirements?.cargo || "Not specified",
    documentation_needed: ensureArray(petPolicy.documentation_needed || []),
    fees: petPolicy.fees || {},
    temperature_restrictions: petPolicy.temperature_breed_restrictions?.temperature || "Not specified",
    // Use our helper function to ensure breed_restrictions is always an array
    breed_restrictions: ensureArray(petPolicy.temperature_breed_restrictions?.breed || []),
    
    // Extract website URLs from airline_info
    official_website: airlineInfo.official_website,
    policy_url: airlineInfo.pet_policy_url || petPolicy.policy_url,
    
    // Flag to indicate whether this was a "no policy found" response
    _no_policy_found: isNoPolicyResult,
    
    // Store the complete unmodified response
    _raw_api_response: rawResponse
  };
};
