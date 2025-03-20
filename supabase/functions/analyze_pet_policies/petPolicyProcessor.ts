
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0';
import { SyncManager } from '../_shared/SyncManager.ts';
import { corsHeaders } from '../_shared/cors.ts';

interface Airline {
  id: string;
  name: string;
  iata_code: string;
  website?: string;
  last_policy_update?: string | null;
}

interface ProcessResult {
  success: boolean;
  iata_code: string;
  error?: string;
}

export async function processPetPoliciesBatch(
  supabase: ReturnType<typeof createClient>,
  syncManager: SyncManager,
  offset: number = 0,
  limit: number = 10,
  compareContent: boolean = false,
  forceContentComparison: boolean = false
) {
  console.log(`Processing pet policies batch starting from offset ${offset} with batch size ${limit}`);
  
  // Get current progress
  const currentProgress = await syncManager.getCurrentProgress();
  if (!currentProgress) {
    throw new Error('No sync progress found');
  }

  console.log(`Current progress before processing: processed=${currentProgress.processed}/${currentProgress.total}, needs_continuation=${currentProgress.needs_continuation}`);

  // Build the query for airlines that need policy updates
  let query = supabase.from('airlines').select('id, name, iata_code, website, last_policy_update');
  
  if (!forceContentComparison && !compareContent) {
    // Only select airlines that have never had policy updates or haven't been updated in 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    query = query.or(`last_policy_update.is.null,last_policy_update.lt.${thirtyDaysAgo.toISOString()}`);
  }
  
  // Apply offset and limit
  query = query.range(offset, offset + limit - 1).order('name');
  
  // Fetch airlines for this batch
  const { data: airlines, error: airlinesError } = await query;
  
  if (airlinesError) {
    console.error('Error fetching airlines:', airlinesError);
    throw airlinesError;
  }

  if (!airlines || airlines.length === 0) {
    console.log(`No more airlines to process at offset ${offset}. Marking sync as complete.`);
    // Mark the sync as complete
    await syncManager.updateProgress({
      is_complete: true,
      needs_continuation: false
    });
    
    return {
      data: {
        message: 'No airlines need updating',
        updated: 0,
        progress: {
          needs_continuation: false,
          next_offset: null
        }
      }
    };
  }

  console.log(`Retrieved ${airlines.length} airlines starting from index ${offset}:`, 
    airlines.map(a => a.iata_code).join(', '));

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  // Process this batch
  const startTime = Date.now();
  let processedItems: string[] = [];
  let errorItems: string[] = [];
  let totalUpdated = 0;

  try {
    // Check for current policies if using content comparison
    const airlineIds = airlines.map(airline => airline.id);
    let existingPolicies: Record<string, any> = {};
    
    if (compareContent || forceContentComparison) {
      const { data: policies } = await supabase
        .from('pet_policies')
        .select('*')
        .in('airline_id', airlineIds);
        
      if (policies) {
        existingPolicies = policies.reduce((acc, policy) => {
          acc[policy.airline_id] = policy;
          return acc;
        }, {} as Record<string, any>);
      }
    }
    
    // Call the batch processing endpoint
    const response = await fetch(`${supabaseUrl}/functions/v1/analyze_batch_pet_policies`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        airlines: airlines.map(airline => ({
          id: airline.id,
          name: airline.name,
          iata_code: airline.iata_code,
          policy_url: airline.website
        }))
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Batch processing failed: ${response.status} - ${errorText}`);
    }
    
    const result = await response.json();
    console.log('Batch processing result:', result);

    // Collect success and error items
    if (result.results) {
      result.results.forEach((item: any) => {
        processedItems.push(item.iata_code);
      });
      totalUpdated = result.results.length;
    }
    
    if (result.errors) {
      result.errors.forEach((item: any) => {
        errorItems.push(item.iata_code);
      });
    }
  } catch (error) {
    console.error('Error processing batch:', error);
    // Continue execution despite error, but log it
    errorItems = [...errorItems, ...airlines.map(a => a.iata_code)];
  }

  const executionTime = Date.now() - startTime;
  
  // Calculate next offset - always advance by the batch size we processed
  const nextOffset = offset + airlines.length;
  const hasMore = nextOffset < currentProgress.total;
  const lastProcessedIata = airlines.length > 0 ? airlines[airlines.length - 1].iata_code : null;

  console.log(`Processed batch complete. Current offset: ${offset}, Next offset: ${nextOffset}`);
  console.log(`Total: ${currentProgress.total}, Processed: ${currentProgress.processed + airlines.length}, HasMore: ${hasMore}`);
  console.log(`Results: ${processedItems.length} successes, ${errorItems.length} errors`);
  console.log(`Last processed IATA: ${lastProcessedIata}`);

  // Update sync progress
  const updatedProcessed = currentProgress.processed + airlines.length;
  await syncManager.updateProgress({
    processed: updatedProcessed,
    last_processed: lastProcessedIata,
    processed_items: processedItems,
    error_items: errorItems,
    needs_continuation: hasMore
  });

  console.log(`Updated progress: processed=${updatedProcessed}/${currentProgress.total}, needs_continuation=${hasMore}, last_processed=${lastProcessedIata}`);

  return {
    data: {
      message: 'Pet policy analysis batch processed',
      totalAirlines: airlines.length,
      processedCount: airlines.length,
      updatedCount: totalUpdated,
      progress: {
        needs_continuation: hasMore,
        next_offset: hasMore ? nextOffset : null,
        last_processed: lastProcessedIata
      }
    }
  };
}
