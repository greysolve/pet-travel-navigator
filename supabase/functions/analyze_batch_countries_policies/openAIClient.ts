
import { Country } from './types.ts';

const systemPrompt = `You are a helpful assistant specializing in finding official government pet and/or live animal import policies. You understand the distinction between arrival policies (for pets entering the country) and transit policies (for pets passing through the country). You prioritize citations you discover from the results that belong to the government of the country you're asked about or the most authoritative citation you can find.
Do not ruminate or demonstrate your thought process into the chat. 
Return ONLY a raw JSON object, with no markdown formatting or explanations.`;

export async function analyzePolicies(country: Country, openaiKey: string): Promise<any[]> {
  console.log(`Analyzing policies for country: ${country.name}`);
  
  const userPrompt = `For ${country.name}'s pet import and transit requirements:
  1. Search specifically for both:
     - Official requirements for pets ENTERING ${country.name} (arrival policy)
     - Official requirements for pets TRANSITING THROUGH ${country.name} (transit policy)
  2. Use the most authoritative URLs from the results, with strong preference for government websites
  3. Extract complete policy details for both scenarios

  Format as TWO separate JSON objects with this structure, one for each policy type:
  {
    "policy_type": "pet_arrival", // or "pet_transit" for the transit policy
    "title": "string - official name of the policy/requirements",
    "description": "string - comprehensive overview specific to arrival or transit",
    "requirements": ["string - list each and every and test requirement"],
    "all_blood_tests": "string - list all blood, urine and other physical biological tests and their names and required conditions",
    "all_other_biological_tests": "string - list all other physical biological tests and their names and required conditions",
    "documentation_needed": ["string - list each and every document required"],
    "fees": {"description": "string - include all fee details if available"},
    "restrictions": {"description": "string - any limitations or special conditions"},
    "quarantine_requirements": "string - detailed quarantine information",
    "vaccination_requirements": ["string - list each required vaccination"],
    "additional_notes": "string - include source authority and last verified date",
    "required_ports_of_entry": "string - include the airports required and the accompanying conditions",
    "policy_url": "string - MUST be the direct URL to the policy. If using non-government source, explain why in additional_notes"
  }

  Return both policies in an array, even if one type has no specific requirements (in which case, indicate "No specific policy found for this type" in the description).`;

  const maxRetries = 3;
  let lastError = null;
  let rawResponse = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Attempt ${attempt} to get policies from OpenAI API with web search`);
      
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
      const annotations = data.choices[0].message.annotations || [];
      
      console.log('=== CONTENT PROCESSING ===');
      console.log('Raw content before cleaning:', content);
      
      // Always save the raw content
      rawResponse = content;
      
      if (annotations && annotations.length > 0) {
        console.log('=== CITATIONS FOUND ===');
        console.log('Citations:', JSON.stringify(annotations, null, 2));
      }

      try {
        // Step 1: Try parsing the content directly first
        let policies;
        try {
          policies = JSON.parse(content);
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
            policies = JSON.parse(basicCleanContent);
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
              policies = JSON.parse(advancedCleanContent);
              console.log('Successfully parsed content after advanced cleanup');
            } catch (advancedCleanError) {
              console.error('All JSON parsing attempts failed');
              
              // Step 4: Try to extract JSON from the text using regex as a last resort
              const jsonPattern = /\[[\s\S]*\]/g;
              const match = content.match(jsonPattern);
              
              if (match) {
                try {
                  policies = JSON.parse(match[0]);
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
        
        // Ensure policies is an array
        const enrichedPolicies = Array.isArray(policies) ? policies : [policies];
        
        // Extract citation URLs if available
        const citationUrls = annotations
          .filter(a => a.type === 'url_citation')
          .map(a => ({
            url: a.url_citation.url,
            title: a.url_citation.title
          }));
        
        // Add citations to each policy
        if (citationUrls.length > 0) {
          enrichedPolicies.forEach(policy => {
            if (!policy.citations) {
              policy.citations = citationUrls;
            }
          });
        }
        
        // Add raw response for debugging to the returned array itself
        enrichedPolicies._raw_api_response = rawResponse;
        
        console.log('=== PARSED POLICIES SUCCESSFULLY ===');
        console.log('Parsed policies count:', enrichedPolicies.length);
        
        return enrichedPolicies;
      } catch (parseError) {
        console.error('Failed to parse API response after all attempts. Error:', parseError.message);
        console.error('First 200 chars of content that failed to parse:', content.substring(0, 200));
        
        // Return a special object indicating parsing failure but including raw response
        return [{
          _parsing_failed: true,
          _raw_api_response: rawResponse,
          error_message: 'Invalid policy data format: ' + parseError.message
        }];
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
        return [{
          _parsing_failed: true,
          _raw_api_response: rawResponse,
          error_message: `Failed after ${maxRetries} attempts: ${lastError ? lastError.message : "Unknown error"}`
        }];
      }
    }
  }

  // Should never reach here, but just in case
  return [{
    _parsing_failed: true,
    _raw_api_response: rawResponse,
    error_message: `Failed after ${maxRetries} attempts: ${lastError ? lastError.message : "Unknown error"}`
  }];
}
