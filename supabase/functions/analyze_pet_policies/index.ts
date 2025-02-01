import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function getDomainFromUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace('www.', '');
  } catch (e) {
    return '';
  }
}

function isValidPolicyUrl(websiteDomain: string, policyUrl: string): boolean {
  const airlineDomain = getDomainFromUrl(websiteDomain);
  const policyDomain = getDomainFromUrl(policyUrl);
  
  if (!airlineDomain || !policyDomain) return false;
  if (policyDomain === airlineDomain) return true;

  const excludedDomains = [
    'rover.com',
    'pettravel.com',
    'alternativeairlines.com',
    'seatmaestro.com',
    'ticketterrier.com',
    'fetchapet.co.uk'
  ];

  return !excludedDomains.includes(policyDomain);
}

function extractJSONFromText(text: string): any {
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    console.error('No JSON object found in content:', text);
    throw new Error('No JSON object found in response');
  }

  try {
    return JSON.parse(jsonMatch[0]);
  } catch (error) {
    console.error('JSON parsing error:', error);
    console.error('Text that failed to parse:', jsonMatch[0]);
    throw new Error(`Failed to parse response JSON: ${error.message}`);
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting pet policy batch analysis...');
    
    const { lastProcessedAirline, batchSize = 5 } = await req.json();
    console.log('Request body:', { lastProcessedAirline, batchSize });

    const PERPLEXITY_API_KEY = Deno.env.get('PERPLEXITY_API_KEY');
    if (!PERPLEXITY_API_KEY) {
      throw new Error('Missing Perplexity API key');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    let query = supabase
      .from('airlines')
      .select('id, name, website')
      .eq('active', true)
      .order('id')
      .limit(batchSize);

    if (lastProcessedAirline) {
      query = query.gt('id', lastProcessedAirline);
    }

    const { data: airlines, error: airlinesError } = await query;

    if (airlinesError) {
      throw new Error(`Failed to fetch airlines: ${airlinesError.message}`);
    }

    console.log(`Processing batch of ${airlines?.length} airlines`);

    const processedAirlines: string[] = [];
    const errorAirlines: string[] = [];
    let processedCount = 0;

    for (const airline of airlines || []) {
      try {
        console.log(`Processing airline: ${airline.name} (${airline.id})`);

        const prompt = `
          Analyze this airline: ${airline.name}
          
          Return a JSON object with these fields (use null if data is not found):
          {
            "airline_info": {
              "official_website": "string (the airline's official website URL, must be complete with https:// and from their own domain)"
            },
            "pet_policy": {
              "pet_types_allowed": ["string"],
              "carrier_requirements": "string",
              "documentation_needed": ["string"],
              "temperature_restrictions": "string",
              "breed_restrictions": ["string"],
              "policy_url": "string (must be from the airline's own website domain)"
            }
          }
          
          IMPORTANT RULES:
          1. The official_website must be the airline's actual website, not a third-party site
          2. The policy_url must be from the airline's own domain
          3. All URLs must start with https:// and be complete
          4. Return null for any field where you're not completely confident of the accuracy
          5. Return ONLY the JSON object, no additional text or explanations
          6. Do not include any markdown formatting
          7. Do not wrap the JSON in code blocks
        `;

        console.log('Sending request to Perplexity API...');
        const response = await fetch('https://api.perplexity.ai/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'llama-3.1-sonar-small-128k-online',
            messages: [
              {
                role: 'system',
                content: 'You are a specialized AI focused on finding official airline websites and their pet travel policies. Only return URLs from airlines\' official websites. Return ONLY valid JSON, no explanations or text.'
              },
              {
                role: 'user',
                content: prompt
              }
            ],
            temperature: 0.1,
            max_tokens: 1000,
          }),
        });

        if (!response.ok) {
          throw new Error(`Perplexity API error: ${response.statusText}`);
        }

        const rawResponseText = await response.text();
        console.log('Raw Perplexity API response:', rawResponseText);

        let parsedData;
        try {
          parsedData = JSON.parse(rawResponseText);
          console.log('Parsed API response:', parsedData);
          
          if (!parsedData.choices?.[0]?.message?.content) {
            throw new Error('Invalid API response structure');
          }

          const content = typeof parsedData.choices[0].message.content === 'string'
            ? extractJSONFromText(parsedData.choices[0].message.content)
            : parsedData.choices[0].message.content;

          // Update airline website if we got a valid one
          if (content.airline_info?.official_website) {
            console.log('Updating airline website:', content.airline_info.official_website);
            await supabase
              .from('airlines')
              .update({ 
                website: content.airline_info.official_website,
                updated_at: new Date().toISOString()
              })
              .eq('id', airline.id);
          }

          // Process pet policy data
          const policyData = content.pet_policy || {};
          
          // Validate policy URL against the official website
          if (policyData.policy_url && content.airline_info?.official_website) {
            if (!isValidPolicyUrl(content.airline_info.official_website, policyData.policy_url)) {
              console.log(`Invalid policy URL detected: ${policyData.policy_url}`);
              policyData.policy_url = null;
            }
          }

          // Clean and validate arrays
          ['pet_types_allowed', 'documentation_needed', 'breed_restrictions'].forEach(field => {
            if (!Array.isArray(policyData[field])) {
              policyData[field] = policyData[field] ? [String(policyData[field])] : null;
            } else if (policyData[field].length === 0) {
              policyData[field] = null;
            } else {
              policyData[field] = policyData[field].map((item: any) => String(item).trim()).filter(Boolean);
              if (policyData[field].length === 0) {
                policyData[field] = null;
              }
            }
          });

          // Clean string fields
          ['carrier_requirements', 'temperature_restrictions'].forEach(field => {
            if (policyData[field] && typeof policyData[field] !== 'string') {
              policyData[field] = String(policyData[field]).trim();
            }
            if (!policyData[field]) {
              policyData[field] = null;
            }
          });

          // Store policy if we found valid data
          if (policyData.policy_url || policyData.pet_types_allowed || policyData.carrier_requirements) {
            console.log('Storing valid policy data:', policyData);
            await supabase
              .from('pet_policies')
              .upsert({
                airline_id: airline.id,
                ...policyData,
                updated_at: new Date().toISOString(),
              }, { 
                onConflict: 'airline_id'
              });
          }

          processedAirlines.push(airline.name);
          processedCount++;

        } catch (parseError) {
          console.error('Error processing airline data:', parseError);
          errorAirlines.push(`${airline.name} (Parse Error)`);
        }

      } catch (airlineError) {
        console.error(`Error processing airline ${airline.name}:`, airlineError);
        errorAirlines.push(`${airline.name} (${airlineError.message})`);
      }
    }

    const lastProcessedId = airlines && airlines.length > 0 ? airlines[airlines.length - 1].id : null;
    const hasMore = airlines && airlines.length === batchSize;

    return new Response(
      JSON.stringify({
        success: true,
        processed_count: processedCount,
        processed_airlines: processedAirlines,
        error_airlines: errorAirlines,
        continuation_token: hasMore ? lastProcessedId : null
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }), 
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});