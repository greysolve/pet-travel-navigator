
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
  // Get total count of countries for bulk mode
  let actualTotalCount = totalCount;
  if (mode === 'clear') {
    const { count, error: countError } = await supabase
      .from('countries')
      .select('*', { count: 'exact', head: true });

    if (countError) throw countError;
    actualTotalCount = count || 0;
  }

  // For single country mode, get just that country
  let countries;
  if (mode && mode !== 'clear') {
    console.log('Processing single country:', mode);
    const { data, error } = await supabase
      .from('countries')
      .select('*')
      .eq('name', mode)
      .limit(1);

    if (error) throw error;
    countries = data;
    actualTotalCount = 1; // For single country mode
    
    // If country not found, try to find it by code
    if (!countries?.length) {
      const { data: byCode, error: codeError } = await supabase
        .from('countries')
        .select('*')
        .eq('code', mode)
        .limit(1);

      if (codeError) throw codeError;
      countries = byCode;
    }
  } else {
    // For bulk mode, get the next chunk
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
    const response = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/analyze_batch_countries_policies`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ countries }),
    });

    if (!response.ok) {
      throw new Error(`Batch processing failed: ${response.statusText}`);
    }

    const batchResult = await response.json();
    results.push(...batchResult.results);
    errors.push(...batchResult.errors);

    // Update progress after processing the batch
    for (const result of batchResult.results) {
      await updateProgressAfterCountry(syncManager, result.country, actualTotalCount);
    }

  } catch (error) {
    console.error('Error processing batch:', error);
    errors.push(...countries.map(country => ({
      country: country.name,
      error: error.message
    })));
  }

  const nextOffset = mode !== 'clear' ? actualTotalCount : offset + countries.length;
  const hasMore = nextOffset < actualTotalCount;

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
    total_remaining: actualTotalCount - nextOffset,
    resume_token: resumeData ? btoa(JSON.stringify(resumeData)) : null
  });
}

async function updateProgressAfterCountry(
  syncManager: SyncManager, 
  countryName: string,
  totalCount: number
): Promise<void> {
  const currentProgress = await syncManager.getCurrentProgress();
  
  await syncManager.updateProgress({
    total: totalCount, // Make sure we update with the correct total
    processed: currentProgress.processed + 1,
    last_processed: countryName,
    processed_items: [...(currentProgress.processed_items || []), countryName],
    error_items: [...(currentProgress.error_items || [])],
    needs_continuation: true
  });
}

