
import { Country } from './types.ts';

const systemPrompt = `You are a helpful assistant specializing in finding official government pet and/or live animal import policies. You understand the distinction between arrival policies (for pets entering the country) and transit policies (for pets passing through the country). You prioritize citations you discover from the results that belong to the government of the country you're asked about or the most authoritative citation you can find.
Do not ruminate or demonstrate your thought process into the chat. 
Return ONLY a raw JSON object, with no markdown formatting or explanations.`;

export async function analyzePolicies(country: Country, perplexityKey: string): Promise<any[]> {
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

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Attempt ${attempt} to get policies from Perplexity API`);
      
      const requestBody = {
        model: 'sonar-pro',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.1,
        max_tokens: 2000,
      };

      console.log('=== API REQUEST ===');
      console.log('URL:', 'https://api.perplexity.ai/chat/completions');
      console.log('Headers:', {
        'Authorization': 'Bearer <REDACTED>',
        'Content-Type': 'application/json',
      });
      console.log('Request Body:', JSON.stringify(requestBody, null, 2));
      
      const response = await fetch('https://api.perplexity.ai/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${perplexityKey}`,
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
        throw new Error(`Perplexity API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log('=== API RESPONSE DATA ===');
      console.log('Complete Response:', JSON.stringify(data, null, 2));

      if (!data.choices?.[0]?.message?.content) {
        console.error('Invalid response format. Response data:', data);
        throw new Error('Invalid response format from Perplexity API');
      }

      const content = data.choices[0].message.content.trim();
      console.log('=== CONTENT PROCESSING ===');
      console.log('Raw content before cleaning:', content);

      try {
        const cleanContent = content
          .replace(/```json\n?|\n?```/g, '')
          .replace(/^\s*\{/, '{')
          .replace(/\}\s*$/, '}')
          .trim();
        
        console.log('Clean content after processing:', cleanContent);
        
        const policies = JSON.parse(cleanContent);
        console.log('=== PARSED POLICIES ===');
        console.log('Final parsed policies:', JSON.stringify(policies, null, 2));
        
        return Array.isArray(policies) ? policies : [policies];
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
