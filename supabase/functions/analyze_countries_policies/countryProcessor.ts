
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0';
import { processPolicyBatch } from '../analyze_batch_countries_policies/policyProcessor.ts';
import { createResponse } from './requestHandler.ts';
import { Country } from './types.ts';
import { SyncManager } from '../_shared/SyncManager.ts';

const BATCH_SIZE = 5;

export async function processCountriesChunk(
  supabase: ReturnType<typeof createClient>,
  syncManager: SyncManager,
  offset: number = 0,
  mode: string = 'clear'
) {
  console.log(`Processing chunk starting from offset ${offset}`);
  
  const currentProgress = await syncManager.getCurrentProgress();
  if (!currentProgress) {
    throw new Error('No sync progress found');
  }

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
    return createResponse({ 
      data: {
        progress: {
          needs_continuation: false,
          next_offset: null
        }
      }
    });
  }

  const openaiKey = Deno.env.get('OPENAI_API_KEY');
  if (!openaiKey) {
    throw new Error('Missing OpenAI API key');
  }

  const startTime = Date.now();
  const { results, errors } = await processPolicyBatch(
    countries as Country[],
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

  // Update sync progress
  await syncManager.updateProgress({
    processed: currentProgress.processed + countries.length,
    last_processed: countries[countries.length - 1].name,
    processed_items: [...(currentProgress.processed_items || []), ...processedCountries],
    error_items: [...(currentProgress.error_items || []), ...errorCountries],
    needs_continuation: hasMore
  });

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
        success_rate: successRate
      }
    }
  });
}
