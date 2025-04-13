
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0';
import { createResponse } from './requestHandler.ts';
import { Country, CountryPolicyResult, ProcessingError } from './types.ts';
import { SyncManager } from '../_shared/SyncManager.ts';

const BATCH_SIZE = 5;

// Process countries using the batch processor via HTTP
async function processPolicyBatch(
  countries: Country[],
  openaiKey: string,
  supabaseUrl: string,
  supabaseKey: string
): Promise<{
  results: CountryPolicyResult[];
  errors: ProcessingError[];
}> {
  const results: CountryPolicyResult[] = [];
  const errors: ProcessingError[] = [];

  console.log(`Processing ${countries.length} countries in batch via HTTP call`);

  // Process each country by calling the analyze_batch_countries_policies function
  for (const country of countries) {
    try {
      const startTime = Date.now();
      
      console.log(`Calling analyze_batch_countries_policies for country: ${country.name}`);
      
      // Call the analyze_batch_countries_policies function via HTTP
      const response = await fetch(`${supabaseUrl}/functions/v1/analyze_batch_countries_policies`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseKey}`,
        },
        body: JSON.stringify({ countries: [country] }),
      });

      if (!response.ok) {
        throw new Error(`Failed to process country policy: ${response.statusText}`);
      }

      const data = await response.json();
      
      // Add country results if successful
      if (data.results && data.results.length > 0) {
        results.push(...data.results);
      }
      
      // Add any errors
      if (data.errors && data.errors.length > 0) {
        errors.push(...data.errors);
      }
      
      console.log(`Successfully processed ${country.name}`);
      
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

  const updatedProcessed = currentProgress.processed + countries.length;
  await syncManager.updateProgress({
    processed: updatedProcessed,
    last_processed: countries[countries.length - 1].name,
    processed_items: [...(currentProgress.processed_items || []), ...processedCountries],
    error_items: [...(currentProgress.error_items || []), ...errorCountries],
    needs_continuation: hasMore
  });

  console.log(`Updated progress: processed=${updatedProcessed}/${currentProgress.total}, needs_continuation=${hasMore}`);

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
