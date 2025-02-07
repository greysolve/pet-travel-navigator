
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0'
import { SyncManager } from '../_shared/SyncManager.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Connection and retry settings
const REQUEST_TIMEOUT = 30000; // Reduced to 30s to fail faster
const SUPABASE_TIMEOUT = 10000; // Timeout for Supabase client operations
const MAX_RETRIES = 3;
const BATCH_SIZE = 3;
const DELAY_BETWEEN_BATCHES = 2000;

async function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function retryOperation<T>(
  operation: () => Promise<T>,
  retryCount = 0
): Promise<T> {
  try {
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Operation timed out')), REQUEST_TIMEOUT);
    });
    const operationPromise = operation();
    return await Promise.race([operationPromise, timeoutPromise]) as T;
  } catch (error) {
    console.error(`Operation failed (attempt ${retryCount + 1}):`, error);
    if (retryCount < MAX_RETRIES) {
      const delayTime = Math.pow(2, retryCount) * 1000;
      console.log(`Retrying in ${delayTime}ms...`);
      await delay(delayTime);
      return retryOperation(operation, retryCount + 1);
    }
    throw error;
  }
}

async function initializeSupabase() {
  console.log('Initializing Supabase client...');
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase credentials');
  }
  
  return createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false
    },
    global: {
      fetch: (url, options) => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), SUPABASE_TIMEOUT);
        
        return fetch(url, {
          ...options,
          signal: controller.signal
        }).finally(() => clearTimeout(timeoutId));
      }
    }
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  let supabase;
  let syncManager;

  try {
    console.log('Starting sync_airline_data function...');
    supabase = await initializeSupabase();
    syncManager = new SyncManager(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      'airlines'
    );

    let requestBody;
    try {
      requestBody = await req.json();
    } catch (error) {
      requestBody = { mode: 'clear' };
    }
    const { mode = 'clear' } = requestBody;
    
    console.log('Starting airline sync process in mode:', mode);

    if (mode === 'update') {
      const { data: missingPolicies, error: missingPoliciesError } = await supabase
        .from('missing_pet_policies')
        .select('id, iata_code, name');

      if (missingPoliciesError) {
        console.error('Failed to fetch missing policies:', missingPoliciesError);
        throw missingPoliciesError;
      }

      const total = missingPolicies?.length || 0;
      await syncManager.initialize(total);
      console.log(`Initialized sync progress with ${total} airlines to process`);

      for (let i = 0; i < (missingPolicies?.length || 0); i += BATCH_SIZE) {
        const batch = missingPolicies!.slice(i, i + BATCH_SIZE);
        console.log(`Processing batch ${Math.floor(i/BATCH_SIZE) + 1} of ${Math.ceil((missingPolicies?.length || 0)/BATCH_SIZE)}`);

        try {
          const { data: result, error } = await retryOperation(async () => {
            return await supabase.functions.invoke('analyze_batch_pet_policies', {
              body: { airlines: batch }
            });
          });

          if (error) {
            console.error(`Failed to process batch:`, error);
            throw error;
          }

          if (!result) {
            throw new Error('No result returned from analyze_batch_pet_policies');
          }

          const currentProgress = await syncManager.getCurrentProgress();
          
          const batchUpdate = {
            processed: currentProgress.processed + result.results.length,
            processed_items: [
              ...currentProgress.processed_items,
              ...result.results.map(success => success.iata_code)
            ],
            error_items: [
              ...currentProgress.error_items,
              ...result.errors.map(error => error.iata_code)
            ],
            last_processed: result.results[result.results.length - 1]?.iata_code || currentProgress.last_processed
          };

          console.log(`Updating progress for batch with ${result.results.length} successes and ${result.errors.length} errors`);
          await syncManager.updateProgress(batchUpdate);

          if (result.results.length > 0) {
            const successfulIataCodes = result.results.map(success => success.iata_code);
            console.log(`Removing ${successfulIataCodes.length} processed items from missing_pet_policies`);
            const { error: deleteError } = await supabase
              .from('missing_pet_policies')
              .delete()
              .in('iata_code', successfulIataCodes);

            if (deleteError) {
              console.error('Error removing processed items from missing_pet_policies:', deleteError);
            }
          }

          // Add delay between batches to prevent rate limiting
          if (i + BATCH_SIZE < (missingPolicies?.length || 0)) {
            console.log(`Waiting ${DELAY_BETWEEN_BATCHES}ms before next batch...`);
            await delay(DELAY_BETWEEN_BATCHES);
          }

        } catch (error) {
          console.error(`Failed to process batch:`, error);
          const currentProgress = await syncManager.getCurrentProgress();
          await syncManager.updateProgress({
            error_items: [
              ...currentProgress.error_items,
              ...batch.map(airline => airline.iata_code)
            ],
            needs_continuation: true
          });
        }
      }

      const finalProgress = await syncManager.getCurrentProgress();
      const isComplete = finalProgress.processed + finalProgress.error_items.length >= total;
      await syncManager.updateProgress({
        is_complete: isComplete,
        needs_continuation: !isComplete
      });

    } else {
      // Full sync mode
      try {
        console.log('Starting full airline sync');
        await syncManager.initialize(1);

        const { data: result, error } = await retryOperation(async () => {
          return await supabase.functions.invoke('fetch_airlines', {
            body: {}
          });
        });

        if (error) {
          console.error('Failed to fetch airlines:', error);
          await syncManager.updateProgress({
            error_items: ['full_sync'],
            needs_continuation: true,
            is_complete: false
          });
          throw error;
        }

        if (!result) {
          throw new Error('No result returned from fetch_airlines');
        }

        console.log('Fetch airlines result:', result);
        
        await syncManager.updateProgress({
          processed: 1,
          last_processed: 'Full sync completed',
          processed_items: ['full_sync'],
          is_complete: true,
          needs_continuation: false
        });
      } catch (error) {
        console.error('Error in full sync:', error);
        await syncManager.updateProgress({
          error_items: ['full_sync'],
          needs_continuation: true,
          is_complete: false
        });
        throw error;
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Airlines sync process started successfully'
      }), 
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json'
        } 
      }
    );
  } catch (error) {
    console.error('Error in sync_airline_data:', error);
    
    try {
      if (syncManager) {
        await syncManager.updateProgress({
          error_items: ['sync_error'],
          needs_continuation: true,
          is_complete: false
        });
      }
    } catch (e) {
      console.error('Failed to update sync error state:', e);
    }
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        errorDetails: error.stack
      }), 
      { 
        status: 500,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json'
        } 
      }
    );
  }
});
