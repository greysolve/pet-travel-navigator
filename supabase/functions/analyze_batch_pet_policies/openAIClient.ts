
/**
 * Handles interactions with the OpenAI API for pet policy analysis
 */

import { Airline } from './types.ts';

const systemPrompt = `You are a helpful assistant specializing in analyzing airline pet policies. You prioritize finding official policies from airline websites and documents. Focus on extracting key information about pet travel requirements and restrictions.
Do not ruminate or demonstrate your thought process into the chat. 
Return ONLY a raw JSON object, with no markdown formatting or explanations.`;

/**
 * Analyzes pet policy for an airline using OpenAI API
 * @param airline Airline object with details
 * @param openaiKey OpenAI API key
 * @returns Processed pet policy data
 */
export async function analyzePetPolicy(airline: Airline, openaiKey: string): Promise<any> {
  console.log(`Analyzing pet policy for airline: ${airline.name}`);
  
  const userMessage = `Analyze this airline's pet policy and return a JSON object with the following information for ${airline.name}. The response must be ONLY the JSON object, no markdown formatting or additional text:
  {
    "airline_info": {
      "official_website": "The main airline website URL if found",
      "pet_policy_url": "The DIRECT URL to the pet travel policy page if found (not just the homepage)"
    },
    "pet_policy": {
      "pet_types_allowed": ["list of allowed pets, specify if in cabin or cargo"],
      "size_restrictions": {
        "max_weight_cabin": "weight in kg/lbs",
        "max_weight_cargo": "weight in kg/lbs",
        "carrier_dimensions_cabin": "size limits"
      },
      "carrier_requirements_cabin": "description of carrier requirements for cabin travel",
      "carrier_requirements_cargo": "description of carrier requirements for cargo travel",
      "documentation_needed": ["list each and every required document"],
      "fees": {
        "in_cabin": "fee amount",
        "cargo": "fee amount"
      },
      "temperature_restrictions": "description of any temperature related restrictions",
      "breed_restrictions": ["list of restricted breeds"]
    }
  }

  Search specifically for:
  1. What pets are allowed in cabin vs cargo
  2. Size and weight limits for both cabin and cargo
  3. Specific carrier requirements for both cabin and cargo
  4. All required documentation and health certificates
  5. Fees for both cabin and cargo transport
  6. Any temperature or weather restrictions
  7. Any breed restrictions
  8. Both the main airline website URL AND the specific direct URL to pet travel policy page

  Return ONLY the JSON object with all available information. If any information is not found, use null for that field.`;

  const maxRetries = 3;
  let lastError = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Attempt ${attempt} to get pet policy from OpenAI API`);
      
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: systemPrompt
            },
            {
              role: 'user',
              content: userMessage
            }
          ],
          temperature: 0.1,
          max_tokens: 2000,
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
      }

      const responseData = await response.json();
      if (!responseData.choices?.[0]?.message?.content) {
        throw new Error('Invalid response format from OpenAI API');
      }

      const rawContent = responseData.choices[0].message.content;
      console.log('Raw API response:', rawContent);

      let content;
      try {
        content = JSON.parse(rawContent);
      } catch (parseError) {
        console.log('Initial parse failed, attempting to clean content');
        const cleanContent = rawContent
          .replace(/```json\n?|\n?```/g, '')
          .replace(/^\s*\{/, '{')
          .replace(/\}\s*$/, '}')
          .trim();
        
        try {
          content = JSON.parse(cleanContent);
        } catch (secondError) {
          console.error('Failed to parse cleaned content:', secondError);
          throw new Error(`JSON parsing failed: ${secondError.message}`);
        }
      }

      console.log('Successfully parsed content:', content);

      if (!content.pet_policy || !content.airline_info) {
        throw new Error('Invalid response structure: missing required fields');
      }

      // Log found URLs for monitoring
      if (content.airline_info.official_website) {
        console.log(`Found main website URL for ${airline.name}: ${content.airline_info.official_website}`);
      }
      
      if (content.airline_info.pet_policy_url) {
        console.log(`Found pet policy URL for ${airline.name}: ${content.airline_info.pet_policy_url}`);
      }

      return {
        pet_types_allowed: content.pet_policy.pet_types_allowed || [],
        carrier_requirements_cabin: content.pet_policy.carrier_requirements_cabin || '',
        carrier_requirements_cargo: content.pet_policy.carrier_requirements_cargo || '',
        documentation_needed: content.pet_policy.documentation_needed || [],
        temperature_restrictions: content.pet_policy.temperature_restrictions || '',
        breed_restrictions: content.pet_policy.breed_restrictions || [],
        policy_url: content.airline_info.pet_policy_url || null, // Only use pet policy URL, no fallback
        official_website: content.airline_info.official_website || null, // Store official website separately
        size_restrictions: {
          max_weight_cabin: content.pet_policy.size_restrictions?.max_weight_cabin || null,
          max_weight_cargo: content.pet_policy.size_restrictions?.max_weight_cargo || null,
          carrier_dimensions_cabin: content.pet_policy.size_restrictions?.carrier_dimensions_cabin || null
        },
        fees: {
          in_cabin: content.pet_policy.fees?.in_cabin || null,
          cargo: content.pet_policy.fees?.cargo || null
        }
      };

    } catch (error) {
      console.error(`Attempt ${attempt} failed:`, error);
      lastError = error;
      
      if (attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 1000;
        console.log(`Waiting ${delay}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        throw new Error(`Failed after ${maxRetries} attempts: ${lastError.message}`);
      }
    }
  }

  throw lastError;
}
