
import { Airline } from './types.ts';

const systemPrompt = `You're an expert on airline pet policies. Your task is to extract clear, detailed information about a provided airline.

Please search for and examine the airline's most recent official pet policy. Return a structured analysis with these sections:
- What pets are allowed (in cabin & cargo)
- Size/weight restrictions
- Carrier requirements (in cabin & cargo)
- Documentation needed
- Fees
- Temperature or breed restrictions

Format your response as a JSON object with these fields:
1. airline_info: Information about the airline (official website URL, pet policy URL)
2. pet_policy: The structured pet policy details with the main categories above

Be extremely precise and factual. If a specific detail isn't found, note that rather than assuming. Only include information that's explicitly stated in the airline's official policy.`;

export async function analyzePetPolicy(airline: Airline, openaiKey: string): Promise<any> {
  console.log(`Analyzing pet policy for ${airline.name} (${airline.iata_code})`);
  
  const userPrompt = `Please search for and analyze the current pet policy for ${airline.name} (${airline.iata_code}).

If possible, find:
1. The official website URL
2. The direct URL to their pet policy page
3. Detailed information about their pet travel policies (cabin & cargo)
4. Any recent updates or changes to their policy

Do not include any generalized information or assumptions. Only include specific details directly from ${airline.name}'s official sources.`;

  const maxRetries = 3;
  let lastError = null;
  // Initialize raw response variable outside the try/catch blocks
  let rawResponse = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Attempt ${attempt} to get policy from OpenAI API with web search`);
      
      const requestBody = {
        model: 'gpt-4o-search-preview',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        web_search_options: {
          search_context_size: "medium"
        },
        max_tokens: 2000,
      };

      console.log('=== API REQUEST ===');
      console.log('Sending request to OpenAI API');
      
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
      console.log('Received response from OpenAI API');

      if (!data.choices?.[0]?.message?.content) {
        console.error('Invalid response format. Response data:', data);
        throw new Error('Invalid response format from OpenAI API');
      }

      const content = data.choices[0].message.content.trim();
      console.log('=== CONTENT PROCESSING ===');
      console.log('Raw content length:', content.length);
      console.log('First 200 characters of raw content:', content.substring(0, 200));
      
      // IMPORTANT: Capture the raw API response FIRST, before any processing
      // This is the complete, unmodified response from OpenAI
      rawResponse = content;
      
      try {
        // Step 1: Try parsing the content as-is first
        let parsedData;
        try {
          parsedData = JSON.parse(content);
          console.log('Successfully parsed content directly as JSON');
        } catch (initialParseError) {
          console.warn('Initial direct JSON parse failed, trying with cleanup steps');
          
          // Step 2: Clean the content of common formatting issues
          const basicCleanContent = content
            .replace(/```json\n?|\n?```/g, '')  // Remove markdown code blocks
            .replace(/^\s*\{/, '{')             // Fix leading whitespace before opening brace
            .replace(/\}\s*$/, '}')             // Fix trailing whitespace after closing brace
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
              .replace(/\n/g, ' ')               // Replace newlines with spaces
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
        
        // Extract data from the nested structure
        const airlineInfo = parsedData.airline_info || {};
        const petPolicy = parsedData.pet_policy || {};
        
        // If we reach here, we successfully parsed the data
        // Combine the data into a normalized object with our expected field structure
        const normalizedData = {
          // Extract specific fields from pet_policy
          pet_types_allowed: petPolicy.allowed_pets || {},
          size_restrictions: petPolicy.size_weight_restrictions || {},
          carrier_requirements_cabin: petPolicy.carrier_requirements?.in_cabin || {},
          carrier_requirements_cargo: petPolicy.carrier_requirements?.cargo || "Not specified",
          documentation_needed: petPolicy.documentation_needed || [],
          fees: petPolicy.fees || {},
          temperature_restrictions: petPolicy.temperature_breed_restrictions?.temperature || "Not specified",
          breed_restrictions: petPolicy.temperature_breed_restrictions?.breed || [],
          
          // Extract website URLs from airline_info
          official_website: airlineInfo.official_website,
          policy_url: airlineInfo.pet_policy_url || petPolicy.policy_url,
          
          // IMPORTANT: Store the complete unmodified response
          _raw_api_response: rawResponse
        };
        
        console.log('=== PARSED DATA SUCCESSFULLY ===');
        console.log('Successfully parsed and normalized policy data');
        
        return normalizedData;
      } catch (parseError) {
        console.error('Failed to parse API response after all attempts. Error:', parseError.message);
        console.error('First 200 chars of content that failed to parse:', content.substring(0, 200));
        
        // Return an object with parsing_failed flag and the raw response
        return {
          _parsing_failed: true,
          _raw_api_response: rawResponse,
          error_message: `Failed to parse response: ${parseError.message}`
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
        const errorWithResponse = {
          _parsing_failed: true,
          _raw_api_response: rawResponse,
          error_message: `Failed after ${maxRetries} attempts: ${lastError.message}`
        };
        console.log('Returning error with raw response:', !!rawResponse);
        return errorWithResponse;
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
