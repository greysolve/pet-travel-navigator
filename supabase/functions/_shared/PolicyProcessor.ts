
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0';
import { analyzePolicies } from './OpenAIClient.ts';
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

      // 1. Get policies via OpenAI with web search
      const policies = await analyzePolicies(country, openaiKey);
      console.log(`Retrieved ${policies.length} policies for ${country.name}`);

      // 2. Extract the arrival and transit policies
      const arrivalPolicy = policies.find(p => p.policy_type === 'pet_arrival') || null;
      const transitPolicy = policies.find(p => p.policy_type === 'pet_transit') || null;

      console.log(`Arrival policy: ${arrivalPolicy ? 'Found' : 'Not found'}`);
      console.log(`Transit policy: ${transitPolicy ? 'Found' : 'Not found'}`);

      // Track which policies were successfully saved
      const savedPolicies = [];

      // 3. Insert or update the arrival policy if it exists
      if (arrivalPolicy) {
        const { error: arrivalError } = await upsertPolicy(
          supabase,
          country.code,
          arrivalPolicy
        );

        if (arrivalError) {
          console.error(`Error upserting arrival policy for ${country.name}:`, arrivalError);
          throw new Error(`Failed to save arrival policy: ${arrivalError.message}`);
        } else {
          console.log(`Successfully saved arrival policy for ${country.name}`);
          savedPolicies.push('arrival');
        }
      }

      // 4. Insert or update the transit policy if it exists
      if (transitPolicy) {
        const { error: transitError } = await upsertPolicy(
          supabase,
          country.code,
          transitPolicy
        );

        if (transitError) {
          console.error(`Error upserting transit policy for ${country.name}:`, transitError);
          throw new Error(`Failed to save transit policy: ${transitError.message}`);
        } else {
          console.log(`Successfully saved transit policy for ${country.name}`);
          savedPolicies.push('transit');
        }
      }

      // 5. Record successful result
      const processingTime = Date.now() - startTime;
      results.push({
        country: country.name,
        processingTimeMs: processingTime,
        policiesFound: policies.length,
        policiesSaved: savedPolicies
      });

      console.log(`Successfully processed ${country.name} in ${processingTime}ms. Saved policies: ${savedPolicies.join(', ')}`);

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

// Helper function to upsert a policy to the database
async function upsertPolicy(
  supabase: ReturnType<typeof createClient>,
  countryCode: string,
  policy: any
) {
  // Map OpenAI response fields to database columns
  const policyData = {
    country_code: countryCode,
    policy_type: policy.policy_type,
    title: policy.title,
    description: policy.description,
    requirements: policy.requirements,
    documentation_needed: policy.documentation_needed,
    all_blood_tests: policy.all_blood_tests,
    all_other_biological_tests: policy.all_other_biological_tests,
    fees: policy.fees,
    restrictions: policy.restrictions,
    quarantine_requirements: policy.quarantine_requirements,
    vaccination_requirements: policy.vaccination_requirements,
    additional_notes: policy.additional_notes,
    required_ports_of_entry: policy.required_ports_of_entry,
    policy_url: policy.policy_url,
    citations: policy.citations || null, // Store citation information
    last_updated: new Date().toISOString()
  };

  console.log(`Upserting ${policy.policy_type} policy for country code ${countryCode}`);
  
  // Use policy_type and country_code as the conflict key
  return await supabase
    .from('country_policies')
    .upsert(policyData, { 
      onConflict: 'country_code,policy_type',
      ignoreDuplicates: false 
    });
}
