
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0';
import { Country, PolicyResult, PolicyError, Policy } from './types.ts';
import { analyzePolicies } from './perplexityClient.ts';

export async function processPolicyBatch(
  countries: Country[],
  perplexityKey: string,
  supabaseUrl: string,
  supabaseKey: string
): Promise<{ results: PolicyResult[]; errors: PolicyError[] }> {
  console.log(`Processing batch of ${countries.length} countries`);
  const results: PolicyResult[] = [];
  const errors: PolicyError[] = [];
  const supabase = createClient(supabaseUrl, supabaseKey);

  for (const country of countries) {
    try {
      console.log(`Processing country: ${country.name}`);
      const policies = await analyzePolicies(country, perplexityKey);
      console.log(`Got policies for ${country.name}:`, policies);

      // Store each policy type separately
      for (const policy of policies) {
        const policyData: Policy = {
          country_code: country.code,
          ...policy,
          last_updated: new Date().toISOString()
        };

        const { error: upsertError } = await supabase
          .from('country_policies')
          .upsert(policyData, {
            onConflict: 'country_code,policy_type'
          });

        if (upsertError) {
          throw upsertError;
        }
      }

      results.push({
        country: country.name,
        success: true
      });

      // Add delay between API calls
      await new Promise(resolve => setTimeout(resolve, 1000));

    } catch (error) {
      console.error(`Error processing ${country.name}:`, error);
      errors.push({
        country: country.name,
        error: error.message
      });
    }
  }

  return { results, errors };
}
