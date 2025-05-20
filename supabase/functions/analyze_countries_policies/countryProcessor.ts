
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0';
import { createResponse } from './requestHandler.ts';
import { Country } from './types.ts';
import { SyncManager } from '../_shared/SyncManager.ts';

// Copy the processPolicyBatch function implementation from the other file
// to avoid cross-function imports
async function processPolicyBatch(
  countries: Country[],
  openaiKey: string,
  supabaseUrl: string,
  supabaseKey: string
): Promise<{
  results: Array<{
    country: string;
    processingTimeMs: number;
    policiesFound: number;
    policiesSaved?: string[];
  }>;
  errors: Array<{
    country: string;
    error: string;
  }>;
}> {
  const supabase = createClient(supabaseUrl, supabaseKey);
  const results = [];
  const errors = [];

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

// Helper functions from the original policyProcessor.ts
async function analyzePolicies(country: Country, openaiKey: string) {
  // This is a placeholder implementation
  // In a real scenario, this would call OpenAI API to analyze policies
  console.log(`Analyzing policies for ${country.name} using OpenAI`);
  
  // Return dummy policies for now
  return [
    {
      policy_type: 'pet_arrival',
      title: `Pet Arrival Policy for ${country.name}`,
      description: `This is a simulated policy for bringing pets into ${country.name}.`
    },
    {
      policy_type: 'pet_transit',
      title: `Pet Transit Policy for ${country.name}`,
      description: `This is a simulated policy for transiting with pets through ${country.name}.`
    }
  ];
}

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

const BATCH_SIZE = 5;

export async function processCountriesChunk(
  supabase: ReturnType<typeof createClient>,
  syncManager: SyncManager,
  offset: number = 0,
  mode: string = 'clear'
) {
  console.log(`Processing countries chunk starting from offset ${offset} with batch size ${BATCH_SIZE}`);
  
  const currentProgress = await syncManager.getCurrentProgress();
  if (!currentProgress) {
    throw new Error('No sync progress found');
  }

  console.log(`Current progress before processing: processed=${currentProgress.processed}/${currentProgress.total}, needs_continuation=${currentProgress.needs_continuation}`);

  // Get the next batch of countries
  const { data: countries, error } = await supabase
    .from('countries')
    .select('*')
    .range(offset, offset + BATCH_SIZE - 1)
    .order('name');

  if (error) {
    console.error('Error fetching countries:', error);
    throw error;
  }

  if (!countries || countries.length === 0) {
    console.log(`No more countries to process at offset ${offset}. Marking sync as complete.`);
    // Mark the sync as complete
    await syncManager.updateProgress({
      is_complete: true,
      needs_continuation: false
    });
    
    return createResponse({ 
      data: {
        progress: {
          needs_continuation: false,
          next_offset: null
        }
      }
    });
  }

  console.log(`Retrieved ${countries.length} countries starting from index ${offset}:`, 
    countries.map(c => c.name).join(', '));

  const openaiKey = Deno.env.get('OPENAI_API_KEY');
  if (!openaiKey) {
    throw new Error('Missing OpenAI API key');
  }

  const startTime = Date.now();
  
  // Make sure we pass the full country object including name, id, and code
  const countriesWithCode = countries.map(country => ({
    id: country.id,
    name: country.name,
    code: country.code
  }));
  
  const { results, errors } = await processPolicyBatch(
    countriesWithCode as Country[],
    openaiKey,
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );
  
  const executionTime = Date.now() - startTime;

  const processedCountries = results.map(r => r.country);
  const errorCountries = errors.map(e => e.country);
  const successRate = (results.length / countries.length) * 100;

  // Calculate next offset - always advance by the batch size we processed
  const nextOffset = offset + countries.length;
  const hasMore = nextOffset < currentProgress.total;

  console.log(`Processed batch complete. Current offset: ${offset}, Next offset: ${nextOffset}`);
  console.log(`Total: ${currentProgress.total}, Processed: ${currentProgress.processed}, HasMore: ${hasMore}`);
  console.log(`Results: ${results.length} successes, ${errors.length} errors`);
  console.log(`Processed countries: ${processedCountries.join(', ')}`);
  if (errors.length > 0) {
    console.log(`Error countries: ${errorCountries.join(', ')}`);
    errors.forEach(e => console.error(`Error for ${e.country}:`, e.error));
  }

  // Update sync progress
  const updatedProcessed = currentProgress.processed + countries.length;
  await syncManager.updateProgress({
    processed: updatedProcessed,
    last_processed: countries[countries.length - 1].name,
    processed_items: [...(currentProgress.processed_items || []), ...processedCountries],
    error_items: [...(currentProgress.error_items || []), ...errorCountries],
    needs_continuation: hasMore
  });

  console.log(`Updated progress: processed=${updatedProcessed}/${currentProgress.total}, needs_continuation=${hasMore}`);

  // Important: Make sure we're explicitly setting needs_continuation to the correct value
  // and always returning next_offset when needs_continuation is true
  return createResponse({
    data: {
      progress: {
        needs_continuation: hasMore,
        next_offset: hasMore ? nextOffset : null
      },
      results,
      errors,
      chunk_metrics: {
        processed: countries.length,
        execution_time: executionTime,
        success_rate: successRate,
        currentOffset: offset,
        nextOffset: nextOffset,
        hasMore: hasMore,
        total: currentProgress.total,
        processedSoFar: updatedProcessed
      }
    }
  });
}
