
/**
 * Handles interactions with the OpenAI API for pet policy analysis
 */

import { Airline, PetPolicyData } from './types.ts';

const systemPrompt = `You are an AI assistant specialized in finding and analyzing airline pet travel policies.
Your task is to:
1. Use your knowledge to identify the official airline website
2. Formulate what the pet policy URL would likely be based on the airline website
3. Extract key information about pet travel requirements and restrictions
4. Provide confidence scores for each piece of information based on how certain you are
5. List the sources of your information

Return ONLY a raw JSON object with no markdown formatting or explanations.`;

/**
 * Analyzes pet policy for an airline using OpenAI API
 * @param airline Airline object with details
 * @param openaiKey OpenAI API key
 * @returns Processed pet policy data
 */
export async function analyzePetPolicy(airline: Airline, openaiKey: string): Promise<PetPolicyData> {
  console.log(`Analyzing pet policy for airline: ${airline.name}`);
  
  // Start with the website from the airline record, if available
  let websiteUrl = airline.website || null;
  
  // Add instructions for the context analysis
  const contextInstruction = websiteUrl 
    ? `The airline's website appears to be ${websiteUrl}. Use your knowledge to identify the pet policy information.` 
    : `Please find the official website for ${airline.name} (IATA code: ${airline.iata_code}) and analyze their pet policy.`;
    
  const userMessage = `As an airline pet policy expert, find and analyze the pet policy for ${airline.name} (IATA code: ${airline.iata_code}).

  Return a JSON object with the following structure:
  {
    "airline_info": {
      "official_website": "Main airline website URL",
      "pet_policy_url": "Direct URL to pet policy page",
      "sources": ["List of sources you used to find this information"],
      "confidence_score": 0.95 // How confident you are in the accuracy of this information (0-1)
    },
    "pet_policy": {
      "pet_types_allowed": ["List of allowed pets, specify in cabin or cargo"],
      "size_restrictions": {
        "max_weight_cabin": "Weight limit for cabin",
        "max_weight_cargo": "Weight limit for cargo",
        "carrier_dimensions_cabin": "Size limits for cabin"
      },
      "carrier_requirements_cabin": "Requirements for cabin carriers",
      "carrier_requirements_cargo": "Requirements for cargo transport",
      "documentation_needed": ["Required documents"],
      "fees": {
        "in_cabin": "Fee amount",
        "cargo": "Fee amount"
      },
      "temperature_restrictions": "Any temperature restrictions",
      "breed_restrictions": ["Restricted breeds"],
      "confidence_score": 0.85 // How confident you are in this policy data (0-1)
    }
  }

  For each field, provide a confidence score between 0 and 1, where:
  - 1.0: You are certain this information is accurate, verified from official sources
  - 0.8: You are highly confident based on reliable sources
  - 0.6: You have moderate confidence but some uncertainty
  - 0.4: You have low confidence, possibly based on indirect information
  - 0.2: You are making an educated guess
  - 0: You have no information

  ${contextInstruction}

  If you cannot find specific information, use null for that field but provide your best effort for all fields.`;

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
          model: 'gpt-4o',
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
        policy_url: content.airline_info.pet_policy_url || null,
        official_website: content.airline_info.official_website || null,
        sources: content.airline_info.sources || [],
        confidence_score: {
          airline_info: content.airline_info.confidence_score || 0,
          pet_policy: content.pet_policy.confidence_score || 0
        },
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
