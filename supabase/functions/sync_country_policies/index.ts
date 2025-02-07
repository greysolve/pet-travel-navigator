
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const countryNameMappings: Record<string, string> = {
  'HK': 'Hong Kong SAR',
  'LA': 'Lao People\'s Democratic Republic',
  'PRK': 'Democratic People\'s Democratic Republic of Korea',
  'KR': 'Republic of Korea',
  'ES': 'Spain and Canary Islands',
  'BN': 'Brunei Darussalam',
  'RU': 'Russian Federation',
  'VN': 'Viet Nam',
  'TR': 'Turkiye',
  'MO': 'Macau SAR',
  'MD': 'Republic of Moldova',
  'CD': 'The Democratic Republic of The Congo',
  'CI': 'Cote d\'Ivoire',
  // Add common variations
  'Hong Kong': 'Hong Kong SAR',
  'Laos': 'Lao People\'s Democratic Republic',
  'North Korea': 'Democratic People\'s Democratic Republic of Korea',
  'South Korea': 'Republic of Korea',
  'Spain': 'Spain and Canary Islands',
  'Brunei': 'Brunei Darussalam',
  'Russia': 'Russian Federation',
  'Vietnam': 'Viet Nam',
  'Turkey': 'Turkiye',
  'Macau': 'Macau SAR',
  'Moldova': 'Republic of Moldova',
  'DR Congo': 'The Democratic Republic of The Congo',
  'DRC': 'The Democratic Republic of The Congo',
  'Ivory Coast': 'Cote d\'Ivoire'
};

const standardizeCountryName = async (country: string, supabase: any): Promise<string> => {
  // If we have a direct mapping, use it
  if (countryNameMappings[country]) {
    console.log(`Mapped country name from ${country} to ${countryNameMappings[country]}`);
    return countryNameMappings[country];
  }

  // Try to find the country in our countries table
  const { data: countryData, error: countryError } = await supabase
    .from('countries')
    .select('name')
    .or(`code.eq.${country},name.ilike.${country}`)
    .maybeSingle();

  if (countryError) {
    console.error('Error looking up country:', countryError);
    throw new Error(`Failed to lookup country: ${countryError.message}`);
  }

  if (countryData?.name) {
    console.log(`Found standard country name: ${countryData.name} for input: ${country}`);
    return countryData.name;
  }

  // If we can't find a mapping, return the original name but log a warning
  console.warn(`No standardized name found for country: ${country}`);
  return country;
};

const findCaseInsensitiveKey = (obj: any, targetKey: string): string | null => {
  const lowerTargetKey = targetKey.toLowerCase();
  const matchingKey = Object.keys(obj).find(
    key => key.toLowerCase() === lowerTargetKey
  );
  return matchingKey || null;
};

const normalizePolicy = (policy: any) => {
  const normalized: any = {};
  const expectedFields = [
    'policy_type',
    'title',
    'description',
    'requirements',
    'documentation_needed',
    'fees',
    'restrictions',
    'quarantine_requirements',
    'vaccination_requirements',
    'additional_notes',
    'policy_url',
    'all_blood_tests',
    'all_other_biological_tests',
    'required_ports_of_entry'
  ];

  expectedFields.forEach(field => {
    const matchingKey = findCaseInsensitiveKey(policy, field);
    if (matchingKey !== null) {
      normalized[field] = policy[matchingKey];
    }
  });

  return normalized;
};

async function fetchPolicyWithAI(country: string, apiKey: string) {
  console.log(`Fetching policy for ${country}`);
  
  const systemPrompt = `You are a helpful assistant specializing in finding official government pet and/or live animal import policies. You understand the distinction between arrival policies (for pets entering the country) and transit policies (for pets passing through the country). You prioritize citations you discover from the results that belong to the government of the country you're asked about or the most authoritative citation you can find.
Return ONLY a raw JSON object, with no markdown formatting or explanations.`;
  
  const userPrompt = `For ${country}'s pet import and transit requirements:
  1. Search specifically for both:
     - Official requirements for pets ENTERING ${country} (arrival policy)
     - Official requirements for pets TRANSITING THROUGH ${country} (transit policy)
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
    "Required_Ports_of_Entry": "string - include the airports required and the accompanying conditions",
    "policy_url": "string - MUST be the direct URL to the policy. If using non-government source, explain why in additional_notes"
  }

  Return both policies in an array, even if one type has no specific requirements (in which case, indicate "No specific policy found for this type" in the description).`;

  try {
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.1-sonar-small-128k-online',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.1,
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Perplexity API error:', {
        status: response.status,
        statusText: response.statusText,
        body: errorText
      });
      throw new Error(`Perplexity API error: ${response.status}`);
    }
  
    const data = await response.json();
    const content = data.choices[0].message.content.trim();
    
    // Clean up markdown formatting if present
    const cleanContent = content.replace(/```json\n|\n```|```/g, '').trim();
    console.log('Cleaned AI response:', cleanContent);
    
    try {
      const policies = JSON.parse(cleanContent);
      const normalizedPolicies = Array.isArray(policies) 
        ? policies.map(normalizePolicy)
        : [normalizePolicy(policies)];
      return normalizedPolicies;
    } catch (error) {
      console.error('Failed to parse AI response:', error);
      console.error('Raw content:', content);
      console.error('Cleaned content:', cleanContent);
      throw new Error('Failed to parse policy data from AI response');
    }
  } catch (error) {
    console.error('Error in fetchPolicyWithAI:', error);
    throw error;
  }
}

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get('PERPLEXITY_API_KEY');
    if (!apiKey) {
      throw new Error('Missing Perplexity API key in environment variables');
    }

    let requestBody;
    try {
      if (req.body) {
        const text = await req.text();
        requestBody = text ? JSON.parse(text) : {};
      } else {
        requestBody = {};
      }
    } catch (error) {
      console.error('Error parsing request body:', error);
      throw new Error('Invalid JSON in request body');
    }

    const { country, fullSync, resume, clearData } = requestBody;
    const BATCH_SIZE = 1; // Process one country at a time to avoid rate limits

    if (!fullSync && !country) {
      throw new Error('Either fullSync must be true or a country must be specified');
    }

    console.log(`Processing request: fullSync=${fullSync}, country=${country}, resume=${resume}`);
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase configuration');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    if (fullSync) {
      // Get list of countries to process
      const { data: countries, error: countriesError } = await supabase
        .from('countries')
        .select('name')
        .order('name');

      if (countriesError) {
        throw new Error(`Failed to fetch countries: ${countriesError.message}`);
      }

      let startIndex = 0;
      let processedItems: string[] = [];
      let errorItems: string[] = [];

      // If resuming, get current progress
      if (resume) {
        const { data: progress } = await supabase
          .from('sync_progress')
          .select('*')
          .eq('type', 'countryPolicies')
          .single();

        if (progress) {
          processedItems = progress.processed_items || [];
          errorItems = progress.error_items || [];
          const lastProcessed = progress.last_processed;
          
          // Find index of last processed country to resume from there
          if (lastProcessed) {
            const lastIndex = countries.findIndex(c => c.name === lastProcessed);
            if (lastIndex !== -1) {
              startIndex = lastIndex + 1;
            }
          }
        }
      } else {
        // Initialize new sync progress
        await supabase
          .from('sync_progress')
          .upsert({
            type: 'countryPolicies',
            total: countries.length,
            processed: 0,
            last_processed: null,
            processed_items: [],
            error_items: [],
            start_time: new Date().toISOString(),
            needs_continuation: true,
            is_complete: false
          }, {
            onConflict: 'type'
          });
      }

      // Process next batch of countries
      const endIndex = Math.min(startIndex + BATCH_SIZE, countries.length);
      const batch = countries.slice(startIndex, endIndex);

      for (const countryObj of batch) {
        try {
          const countryName = countryObj.name;
          console.log(`Processing country: ${countryName}`);
          
          const policies = await fetchPolicyWithAI(countryName, apiKey);
          
          // Store each policy
          for (const policy of policies) {
            const normalizedPolicy = normalizePolicy(policy);
            
            const { error: upsertError } = await supabase
              .from('country_policies')
              .upsert({
                country_code: countryName,
                ...normalizedPolicy,
                last_updated: new Date().toISOString()
              }, {
                onConflict: 'country_code,policy_type'
              });

            if (upsertError) {
              throw upsertError;
            }
          }

          processedItems.push(countryName);
          
        } catch (error) {
          console.error(`Error processing country ${countryObj.name}:`, error);
          errorItems.push(`${countryObj.name}: ${error.message}`);
        }
      }

      // Update progress
      const isComplete = endIndex >= countries.length;
      await supabase
        .from('sync_progress')
        .update({
          processed: processedItems.length,
          last_processed: batch[batch.length - 1]?.name || null,
          processed_items: processedItems,
          error_items: errorItems,
          needs_continuation: !isComplete,
          is_complete: isComplete,
          resume_token: isComplete ? null : String(endIndex)
        })
        .eq('type', 'countryPolicies');

      return new Response(
        JSON.stringify({ 
          success: true, 
          isComplete,
          nextBatch: isComplete ? null : endIndex
        }), 
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } else {
      // Handle individual country sync
      const standardizedCountry = await standardizeCountryName(country, supabase);
      console.log(`Processing single country: ${standardizedCountry}`);
      
      // Initialize sync progress for individual country
      await supabase
        .from('sync_progress')
        .upsert({
          type: 'countryPolicies',
          total: 1,
          processed: 0,
          last_processed: null,
          processed_items: [],
          error_items: [],
          start_time: new Date().toISOString(),
          needs_continuation: false,
          is_complete: false
        }, {
          onConflict: 'type'
        });

      try {
        const policies = await fetchPolicyWithAI(standardizedCountry, apiKey);
        
        // Store each policy
        for (const policy of policies) {
          const normalizedPolicy = normalizePolicy(policy);
          
          const { error: upsertError } = await supabase
            .from('country_policies')
            .upsert({
              country_code: standardizedCountry,
              ...normalizedPolicy,
              last_updated: new Date().toISOString()
            }, {
              onConflict: 'country_code,policy_type'
            });

          if (upsertError) {
            throw upsertError;
          }
        }

        // Update progress
        await supabase
          .from('sync_progress')
          .update({
            processed: 1,
            last_processed: standardizedCountry,
            processed_items: [standardizedCountry],
            needs_continuation: false,
            is_complete: true
          })
          .eq('type', 'countryPolicies');

      } catch (error) {
        console.error(`Error processing country ${standardizedCountry}:`, error);
        
        // Update progress with error
        await supabase
          .from('sync_progress')
          .update({
            error_items: [`${standardizedCountry}: ${error.message}`],
            needs_continuation: false,
            is_complete: true
          })
          .eq('type', 'countryPolicies');
          
        throw error;
      }
    }

    return new Response(
      JSON.stringify({ success: true }), 
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in edge function:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: error instanceof Error ? error.stack : undefined
      }), 
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
