
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0'
import { SyncManager } from '../_shared/SyncManager.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const REQUEST_TIMEOUT = 30000; // 30 seconds
const MAX_RETRIES = 3;

async function fetchWithTimeout(resource: string, options: RequestInit & { timeout?: number }) {
  const { timeout = REQUEST_TIMEOUT } = options;
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(resource, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    throw error;
  }
}

async function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function retryOperation<T>(
  operation: () => Promise<T>,
  retryCount = 0
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (retryCount < MAX_RETRIES) {
      console.log(`Operation failed, attempt ${retryCount + 1}. Retrying...`);
      await delay(Math.pow(2, retryCount) * 1000); // Exponential backoff
      return retryOperation(operation, retryCount + 1);
    }
    throw error;
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      headers: {
        ...corsHeaders,
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
      }
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)
    const syncManager = new SyncManager(supabaseUrl, supabaseKey, 'airlines')

    const { mode = 'clear' } = await req.json()
    console.log('Starting airline sync process in mode:', mode)

    if (mode === 'update') {
      const { data: missingPolicies, error: missingPoliciesError } = await supabase
        .from('missing_pet_policies')
        .select('iata_code, name')

      if (missingPoliciesError) {
        console.error('Failed to fetch missing policies:', missingPoliciesError)
        throw missingPoliciesError
      }

      await syncManager.initialize(missingPolicies?.length || 0)

      const startTime = Date.now()
      let successCount = 0
      let failureCount = 0

      for (const airline of missingPolicies || []) {
        if (!airline.iata_code) continue

        try {
          const response = await retryOperation(async () => {
            return await fetchWithTimeout(
              `${supabaseUrl}/functions/v1/fetch_airlines`,
              {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${supabaseKey}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ iataCode: airline.iata_code }),
                timeout: REQUEST_TIMEOUT
              }
            );
          });

          if (!response.ok) {
            const errorText = await response.text()
            console.error(`Failed to fetch airline ${airline.iata_code}:`, errorText)
            await syncManager.addErrorItem(airline.iata_code, errorText)
            failureCount++
            continue
          }

          await syncManager.addProcessedItem(airline.iata_code)
          successCount++

          // Log progress metrics
          const elapsed = Date.now() - startTime
          const avgTimePerItem = elapsed / (successCount + failureCount)
          const remainingItems = (missingPolicies?.length || 0) - (successCount + failureCount)
          const estimatedTimeRemaining = avgTimePerItem * remainingItems

          await syncManager.updateProgress({
            processed: successCount,
            last_processed: airline.iata_code,
            processed_items: [...(await syncManager.getCurrentProgress()).processed_items, airline.iata_code]
          })

          console.log(`Progress metrics:
            Success: ${successCount}
            Failures: ${failureCount}
            Avg Time/Item: ${avgTimePerItem.toFixed(2)}ms
            Est. Remaining: ${(estimatedTimeRemaining/1000).toFixed(2)}s
          `)

        } catch (error) {
          console.error(`Failed to process airline ${airline.iata_code}:`, error)
          await syncManager.addErrorItem(airline.iata_code, error.message)
          failureCount++
        }
      }
    } else {
      try {
        const response = await retryOperation(async () => {
          return await fetchWithTimeout(
            `${supabaseUrl}/functions/v1/fetch_airlines`,
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${supabaseKey}`,
                'Content-Type': 'application/json',
              },
              timeout: REQUEST_TIMEOUT
            }
          );
        });

        if (!response.ok) {
          const errorText = await response.text()
          console.error('Failed to fetch airlines:', errorText)
          throw new Error(`Failed to fetch airlines: ${errorText}`)
        }

        const result = await response.json()
        console.log('Fetch airlines result:', result)
        
        // Update progress for full sync mode
        const progress = await syncManager.getCurrentProgress()
        if (progress) {
          await syncManager.updateProgress({
            processed: progress.processed + 1,
            last_processed: 'Full sync completed',
            processed_items: [...progress.processed_items, 'Full sync']
          })
        }
      } catch (error) {
        console.error('Error in full sync:', error)
        await syncManager.addErrorItem('full_sync', error.message)
        throw error
      }
    }

    await syncManager.complete()

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Airlines sync completed successfully'
      }), 
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json'
        } 
      }
    )
  } catch (error) {
    console.error('Error in sync_airline_data:', error)
    
    // Ensure the sync manager properly handles the error state if available
    try {
      const syncManager = new SyncManager(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
        'airlines'
      )
      await syncManager.addErrorItem('sync_error', error.message)
    } catch (e) {
      console.error('Failed to update sync error state:', e)
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
    )
  }
})
