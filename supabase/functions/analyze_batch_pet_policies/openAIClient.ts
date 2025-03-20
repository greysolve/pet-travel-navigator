
import { Airline } from './types.ts';

const systemPrompt = `You're an expert on airline pet policies. Your task is to extract clear, detailed information about pet travel policies from a provided airline.

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
      console.log('Raw content:', content);
      
      try {
        const cleanContent = content
          .replace(/```json\n?|\n?```/g, '')
          .replace(/^\s*\{/, '{')
          .replace(/\}\s*$/, '}')
          .trim();
          
        let parsedData = JSON.parse(cleanContent);
        
        // Add raw API response for debugging purposes
        parsedData._raw_api_response = cleanContent;
        
        // Extract the airline info and pet policy
        const airlineInfo = parsedData.airline_info || {};
        const petPolicy = parsedData.pet_policy || {};
        
        // Combine them into a single object with normalized field names
        const result = {
          ...petPolicy,
          official_website: airlineInfo.official_website,
          policy_url: airlineInfo.pet_policy_url || petPolicy.policy_url,
          _raw_api_response: cleanContent // Store raw response for debugging
        };
        
        console.log('=== PARSED DATA ===');
        console.log('Successfully parsed policy data');
        
        return result;
      } catch (parseError) {
        console.error('Failed to parse API response. Parse error:', parseError);
        console.error('Content that failed to parse:', content);
        throw new Error('Invalid policy data format');
      }

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
