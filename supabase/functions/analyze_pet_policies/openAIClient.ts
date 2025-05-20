
// This is a local copy of the openAIClient.ts functionality needed by petPolicyProcessor.ts

import { Airline } from './types.ts';

const systemPrompt = `You are a helpful assistant specializing in finding official airline pet policies. Do not demonstrate your thought process into the chat. Return ONLY a raw JSON object, with no markdown formatting or explanations.`;

export async function analyzePetPolicy(airline: Airline, openaiKey: string): Promise<any> {
  console.log(`Analyzing pet policy for ${airline.name} (${airline.iata_code})`);
  
  const userPrompt = createUserPrompt(airline.name, airline.iata_code);

  const maxRetries = 3;
  let lastError = null;
  let rawResponse = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Attempt ${attempt} to get policy from OpenAI API with web search`);
      
      const requestBody = {
        model: 'gpt-4o-mini-search-preview',
        web_search_options: {
          search_context_size: "medium",
        },
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.1,
        max_tokens: 2000,
      };

      console.log('=== API REQUEST ===');
      console.log('URL:', 'https://api.openai.com/v1/chat/completions');
      console.log('Headers:', {
        'Authorization': 'Bearer <REDACTED>',
        'Content-Type': 'application/json',
      });
      console.log('Request Body:', JSON.stringify(requestBody, null, 2));
      
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      console.log('=== API RESPONSE STATUS ===');
      console.log('Status:', response.status);
      console.log('Status Text:', response.statusText);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error Response:', errorText);
        throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log('=== API RESPONSE DATA ===');
      console.log('Complete Response:', JSON.stringify(data, null, 2));

      if (!data.choices?.[0]?.message?.content) {
        console.error('Invalid response format. Response data:', data);
        throw new Error('Invalid response format from OpenAI API');
      }

      const content = data.choices[0].message.content.trim();
      console.log('=== CONTENT PROCESSING ===');
      console.log('Raw content before cleaning:', content);
      
      // Always save the raw content
      rawResponse = content;
      
      try {
        // Step 1: Try parsing the content directly first
        let parsedData;
        try {
          parsedData = JSON.parse(content);
          console.log('Successfully parsed content directly as JSON');
        } catch (initialParseError) {
          console.warn('Initial direct JSON parse failed, trying with cleanup steps');
          
          // Step 2: Clean the content of common formatting issues
          const basicCleanContent = content
            .replace(/```json\n?|\n?```/g, '')  // Remove markdown code blocks
            .replace(/^\s*\[/, '[')             // Fix leading whitespace before opening array bracket
            .replace(/\]\s*$/, ']')             // Fix trailing whitespace after closing array bracket
            .trim();
            
          try {
            parsedData = JSON.parse(basicCleanContent);
            console.log('Successfully parsed content after basic cleanup');
          } catch (basicCleanError) {
            console.warn('Basic cleaned JSON parse failed, attempting advanced cleanup');
            
            // Step 3: More aggressive cleanup for difficult cases
            const advancedCleanContent = basicCleanContent
              .replace(/\\"/g, '"')              // Replace escaped quotes
              .replace(/\\\\/g, '\\')            // Replace double backslashes
              .replace(/,\s*\}/g, '}')           // Remove trailing commas
              .replace(/,\s*\]/g, ']')           // Remove trailing commas in arrays
              .trim();
              
            try {
              parsedData = JSON.parse(advancedCleanContent);
              console.log('Successfully parsed content after advanced cleanup');
            } catch (advancedCleanError) {
              console.error('All JSON parsing attempts failed');
              
              // Step 4: Try to extract JSON from the text using regex as a last resort
              const jsonPattern = /\{[\s\S]*\}/g;
              const match = content.match(jsonPattern);
              
              if (match) {
                try {
                  parsedData = JSON.parse(match[0]);
                  console.log('Successfully extracted and parsed JSON using regex');
                } catch (regexError) {
                  throw new Error('Failed to parse content as JSON after all attempts');
                }
              } else {
                throw new Error('Could not locate JSON pattern in content');
              }
            }
          }
        }
        
        // Add raw response for debugging to the returned object itself
        parsedData._raw_api_response = rawResponse;
        
        console.log('=== PARSED POLICY SUCCESSFULLY ===');
        
        return parsedData;
      } catch (parseError) {
        console.error('Failed to parse API response after all attempts. Error:', parseError.message);
        console.error('First 200 chars of content that failed to parse:', content.substring(0, 200));
        
        // Return a special object indicating parsing failure but including raw response
        return {
          _parsing_failed: true,
          _raw_api_response: rawResponse,
          error_message: 'Invalid policy data format: ' + parseError.message
        };
      }

    } catch (error) {
      console.error(`Attempt ${attempt} failed:`, error);
      lastError = error;
      
      if (attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 1000;
        console.log(`Waiting ${delay}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        // Create an error object that includes the raw response if available
        return {
          _parsing_failed: true,
          _raw_api_response: rawResponse,
          error_message: `Failed after ${maxRetries} attempts: ${lastError ? lastError.message : "Unknown error"}`
        };
      }
    }
  }

  // Should never reach here, but just in case
  return {
    _parsing_failed: true,
    _raw_api_response: rawResponse,
    error_message: `Failed after ${maxRetries} attempts: ${lastError ? lastError.message : "Unknown error"}`
  };
}

// Helper function to create the user prompt
function createUserPrompt(airlineName: string, iataCode: string): string {
  return `Find the detailed pet policy information for ${airlineName} (${iataCode}) airline. Search for the most current and official information from the airline's own website.

Format the response as a complete JSON object with these fields:
{
  "airline_name": "${airlineName}",
  "iata_code": "${iataCode}",
  "policy_url": "direct URL to the official pet policy page",
  "last_updated": "date when policy was last confirmed",
  "pet_types_allowed": ["list of allowed pet types (dogs, cats, etc)"],
  "pet_travel_options": ["cabin", "checked/cargo", "both", or "none"],
  "size_restrictions": {
    "cabin": "detailed size/weight limits for cabin",
    "cargo": "detailed size/weight limits for cargo hold"
  },
  "breed_restrictions": ["list any restricted breeds", "or 'None' if no restrictions"],
  "carrier_requirements_cabin": "detailed carrier requirements for cabin",
  "carrier_requirements_cargo": "detailed carrier requirements for cargo",
  "documentation_needed": ["health certificate", "vaccination records", "etc"],
  "fees": {
    "cabin": "fee amount for cabin travel",
    "cargo": "fee amount for cargo travel",
    "currency": "USD/EUR/etc",
    "additional_fees": "any other fees that apply"
  },
  "temperature_restrictions": "any temperature or seasonal restrictions",
  "booking_process": "how to book/reserve pet travel",
  "service_animals_policy": "separate policy details for service animals",
  "additional_notes": "any other important information"
}

Include as much detail as possible. If information is unavailable for any field, mark it as "Not specified". If pets are not allowed at all, indicate this in pet_travel_options and additional_notes.`;
}
