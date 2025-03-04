
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0';
import { analyzePolicies } from './openAIClient.ts';
import { Country, CountryPolicyResult, ProcessingError } from './types.ts';

export async function processPolicyBatch(
  countries: Country[],
  openaiKey: string,
  supabaseUrl: string,
  supabaseKey: string
): Promise<{
  results: CountryPolicyResult[];
  errors: ProcessingError[];
}> {
  const supabase = createClient(supabaseUrl, supabaseKey);
  const results: CountryPolicyResult[] = [];
  const errors: ProcessingError[] = [];

  console.log(`Starting batch processing for ${countries.length} countries`);

  for (const country of countries) {
    try {
      console.log(`Processing country: ${country.name}`);
      const startTime = Date.now();

      // 1. Get policies via OpenAI
      const policies = await analyzePolicies(country, openaiKey);
      console.log(`Retrieved ${policies.length} policies for ${country.name}`);

      // 2. Extract the arrival and transit policies
      const arrivalPolicy = policies.find(p => p.policy_type === 'pet_arrival') || null;
      const transitPolicy = policies.find(p => p.policy_type === 'pet_transit') || null;

      console.log(`Arrival policy: ${arrivalPolicy ? 'Found' : 'Not found'}`);
      console.log(`Transit policy: ${transitPolicy ? 'Found' : 'Not found'}`);

      // 3. Upsert to the country_policies table
      const { data, error } = await supabase
        .from('country_policies')
        .upsert({
          country_id: country.id,
          country_name: country.name,
          arrival_policy: arrivalPolicy,
          transit_policy: transitPolicy,
          last_analyzed: new Date().toISOString()
        }, { onConflict: 'country_id' });

      if (error) {
        console.error(`Error upserting policy for ${country.name}:`, error);
        throw error;
      }

      // 4. Record successful result
      const processingTime = Date.now() - startTime;
      results.push({
        country: country.name,
        processingTimeMs: processingTime,
        policiesFound: policies.length
      });

      console.log(`Successfully processed ${country.name} in ${processingTime}ms`);

    } catch (error) {
      console.error(`Error processing ${country.name}:`, error);
      errors.push({
        country: country.name,
        error: error.message
      });
    }
  }

  console.log(`Completed batch. Successes: ${results.length}, Failures: ${errors.length}`);
  return { results, errors };
}
