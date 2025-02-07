
import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0';
import { SyncManager } from '../_shared/SyncManager.ts';
import { createResponse } from './requestHandler.ts';

const CHUNK_SIZE = 5;
const DELAY_BETWEEN_COUNTRIES = 1000; // 1 second delay

export async function processCountriesChunk(
  supabase: SupabaseClient,
  syncManager: SyncManager,
  offset: number,
  totalCount: number,
  mode: string
): Promise<Response> {
  const { data: countries, error: batchError } = await supabase
    .from('countries')
    .select('*')
    .range(offset, offset + CHUNK_SIZE - 1);

  if (batchError) {
    console.error('Error fetching countries batch:', batchError);
    throw batchError;
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

  for (const country of countries) {
    try {
      const result = await processCountry(country.name, supabase);
      console.log('Country processing result:', result);
      results.push(country.name);

      await updateProgressAfterCountry(syncManager, country.name);
      await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_COUNTRIES));

    } catch (error) {
      console.error('Error processing country:', country.name, error);
      errors.push({
        country: country.name,
        error: error.message
      });
    }
  }

  const nextOffset = offset + countries.length;
  const hasMore = nextOffset < totalCount;

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
    total_remaining: totalCount - nextOffset,
    resume_token: resumeData ? btoa(JSON.stringify(resumeData)) : null
  });
}

async function processCountry(countryName: string, supabase: SupabaseClient): Promise<any> {
  console.log(`Processing country: ${countryName}`);
  
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase configuration');
  }

  const response = await fetch(`${supabaseUrl}/functions/v1/sync_country_policies`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${supabaseKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ country: countryName }),
  });

  if (!response.ok) {
    throw new Error(`Failed to process country: ${response.statusText}`);
  }

  return response.json();
}

async function updateProgressAfterCountry(syncManager: SyncManager, countryName: string): Promise<void> {
  const currentProgress = await syncManager.getCurrentProgress();
  
  await syncManager.updateProgress({
    processed: currentProgress.processed + 1,
    last_processed: countryName,
    processed_items: [...(currentProgress.processed_items || []), countryName],
    error_items: [...(currentProgress.error_items || [])],
    needs_continuation: true
  });
}
