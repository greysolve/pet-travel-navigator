
import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0';
import { SyncManager } from '../_shared/SyncManager.ts';
import { createResponse } from './requestHandler.ts';

const CHUNK_SIZE = 5;

export async function processCountriesChunk(
  supabase: SupabaseClient,
  syncManager: SyncManager,
  offset: number,
  mode: string
): Promise<Response> {
  // Get the next chunk of countries
  let countries;
  if (mode && mode !== 'clear') {
    console.log('Processing single country:', mode);
    const { data, error } = await supabase
      .from('countries')
      .select('*')
      .or(`name.ilike.${mode},code.ilike.${mode}`)
      .limit(1);

    if (error) throw error;
    countries = data;
  } else {
    const { data: batchData, error: batchError } = await supabase
      .from('countries')
      .select('*')
      .range(offset, offset + CHUNK_SIZE - 1);

    if (batchError) throw batchError;
    countries = batchData;
  }

  if (!countries || countries.length === 0) {
    console.log('No more countries to process');
    await syncManager.updateProgress({ 
      is_complete: true,
      needs_continuation: false
    });
    return createResponse({ 
      success: true, 
      message: 'No more countries to process',
      has_more: false 
    });
  }

  console.log(`Processing chunk of ${countries.length} countries`);
  
  const results = [];
  const errors = [];
  const chunkStartTime = Date.now();

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase configuration');
    }

    // Call the batch processor with the chunk of countries
    const response = await fetch(`${supabaseUrl}/functions/v1/analyze_batch_countries_policies`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ countries }),
    });

    if (!response.ok) {
      throw new Error(`Batch processing failed: ${response.statusText}`);
    }

    const batchResult = await response.json();
    console.log('Batch processing result:', batchResult);

    // Update results and errors from batch processing
    if (batchResult.results) {
      results.push(...batchResult.results);
    }
    if (batchResult.errors) {
      errors.push(...batchResult.errors);
    }

    // Update progress after processing the batch
    const currentProgress = await syncManager.getCurrentProgress();
    if (!currentProgress) {
      throw new Error('No sync progress found');
    }

    // Extract successfully processed country names and error country names
    const processedCountries = results.map(r => r); // Take the country names directly
    const errorCountries = errors.map(e => e); // Take the error country names directly

    await syncManager.updateProgress({
      processed: currentProgress.processed + countries.length,
      last_processed: countries[countries.length - 1].name,
      processed_items: [...(currentProgress.processed_items || []), ...processedCountries],
      error_items: [...(currentProgress.error_items || []), ...errorCountries],
      needs_continuation: true
    });

  } catch (error) {
    console.error('Error processing batch:', error);
    errors.push(...countries.map(country => ({
      country: country.name,
      error: error.message
    })));
  }

  const currentProgress = await syncManager.getCurrentProgress();
  if (!currentProgress) {
    throw new Error('No sync progress found');
  }

  const nextOffset = offset + countries.length;
  const hasMore = nextOffset < currentProgress.total;

  if (!hasMore) {
    await syncManager.updateProgress({ 
      is_complete: true,
      needs_continuation: false
    });
  }

  const resumeData = hasMore ? {
    offset: nextOffset,
    mode,
    timestamp: new Date().toISOString()
  } : null;
  
  return createResponse({
    success: true,
    results,
    errors,
    chunk_metrics: {
      processed: countries.length,
      execution_time: Date.now() - chunkStartTime,
      success_rate: (results.length / countries.length) * 100
    },
    has_more: hasMore,
    next_offset: hasMore ? nextOffset : null,
    total_remaining: currentProgress.total - nextOffset,
    resume_token: resumeData ? btoa(JSON.stringify(resumeData)) : null
  });
}
