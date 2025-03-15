
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0'
import { corsHeaders } from '../_shared/cors.ts'
import { SyncManager } from '../_shared/SyncManager.ts'

interface PetPolicy {
  airline_id: string;
  pet_types_allowed: string[];
  carrier_requirements?: string;
  carrier_requirements_cabin?: string;
  carrier_requirements_cargo?: string;
  documentation_needed: string[];
  temperature_restrictions?: string;
  breed_restrictions: string[];
  policy_url?: string;
  size_restrictions: {
    max_weight_cabin?: string;
    max_weight_cargo?: string;
    carrier_dimensions_cabin?: string;
  };
  fees: {
    in_cabin?: string;
    cargo?: string;
  };
}

interface SyncRequest {
  resumeSync?: boolean;
  mode?: 'clear' | 'update';
  offset?: number;
  limit?: number;
  forceContentComparison?: boolean;
  compareContent?: boolean;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        ...corsHeaders,
        'Access-Control-Max-Age': '86400',
      },
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing environment variables');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const syncManager = new SyncManager(supabase, 'petPolicies');
    
    const requestData: SyncRequest = await req.json();
    const { 
      resumeSync = false, 
      mode = 'update', 
      offset = 0, 
      limit = 10,
      forceContentComparison = false,
      compareContent = false
    } = requestData;

    console.log('Analyzing pet policies with params:', { 
      resumeSync, 
      mode, 
      offset,
      forceContentComparison,
      compareContent
    });

    // Clear existing data if requested
    if (mode === 'clear' && !resumeSync) {
      await syncManager.clearSyncProgress();
      
      // Clear pet policies data
      const { error: clearError } = await supabase
        .from('pet_policies')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');
      
      if (clearError) {
        throw new Error(`Failed to clear pet policies: ${clearError.message}`);
      }
      
      // Reset last_policy_update for airlines
      const { error: resetError } = await supabase
        .from('airlines')
        .update({ last_policy_update: null })
        .is('last_policy_update', 'NOT NULL');
      
      if (resetError) {
        throw new Error(`Failed to reset last_policy_update: ${resetError.message}`);
      }
    }

    // Fetch airlines that need policy updates
    let query = supabase.from('airlines').select('id, name, iata_code, website, last_policy_update');
    
    if (mode === 'update' && !forceContentComparison && !compareContent) {
      // Only select airlines that have never had policy updates or haven't been updated in 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      query = query.or(`last_policy_update.is.null,last_policy_update.lt.${thirtyDaysAgo.toISOString()}`);
    }
    
    // Apply offset and limit
    query = query.range(offset, offset + limit - 1).order('name');
    
    const { data: airlines, error: airlinesError } = await query;
    
    if (airlinesError) {
      throw new Error(`Failed to fetch airlines: ${airlinesError.message}`);
    }

    if (airlines.length === 0) {
      return new Response(
        JSON.stringify({ 
          message: 'No airlines need updating',
          updated: 0
        }),
        { 
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        }
      );
    }

    // Initialize or resume sync progress
    if (resumeSync) {
      await syncManager.continueSyncProgress();
    } else {
      // Count total airlines for progress tracking
      const { count, error: countError } = await supabase
        .from('airlines')
        .select('*', { count: 'exact', head: true });
      
      if (countError) {
        throw new Error(`Failed to count airlines: ${countError.message}`);
      }
      
      await syncManager.initializeSyncProgress(count || 0);
    }

    // Process airlines in smaller batches for better reliability
    const batchSize = 5;
    const airlineBatches = [];
    
    for (let i = 0; i < airlines.length; i += batchSize) {
      airlineBatches.push(airlines.slice(i, i + batchSize));
    }

    console.log(`Processing ${airlines.length} airlines in ${airlineBatches.length} batches`);

    let totalProcessed = 0;
    let totalUpdated = 0;
    
    for (const batch of airlineBatches) {
      try {
        // Check for current policies if using content comparison
        const airlineIds = batch.map(airline => airline.id);
        let existingPolicies: Record<string, PetPolicy> = {};
        
        if (compareContent || forceContentComparison) {
          const { data: policies } = await supabase
            .from('pet_policies')
            .select('*')
            .in('airline_id', airlineIds);
            
          if (policies) {
            existingPolicies = policies.reduce((acc, policy) => {
              acc[policy.airline_id] = policy;
              return acc;
            }, {} as Record<string, PetPolicy>);
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
            airlines: batch.map(airline => ({
              id: airline.id,
              name: airline.name,
              iata_code: airline.iata_code,
              policy_url: airline.website
            }))
          })
        });
        
        if (!response.ok) {
          throw new Error(`Batch processing failed: ${response.status} ${await response.text()}`);
        }
        
        const result = await response.json();
        console.log('Batch processing result:', result);

        // Update progress with processed items
        const processedItems = result.results.map((item: any) => item.iata_code);
        const errorItems = result.errors.map((item: any) => item.iata_code);
        
        await syncManager.updateSyncProgress({
          processed: (await syncManager.getSyncProgress()).processed + processedItems.length,
          processedItems,
          errorItems,
          lastProcessed: batch[batch.length - 1].iata_code
        });
        
        totalProcessed += processedItems.length;
        totalUpdated += result.results.length;
        
        // Add delay between batches to prevent rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (batchError) {
        console.error('Error processing batch:', batchError);
        // Continue with next batch despite errors
      }
    }

    if (totalProcessed >= airlines.length) {
      // Check if all airlines have been processed
      const { count, error: countError } = await supabase
        .from('airlines')
        .select('*', { count: 'exact', head: true });
      
      const { processed } = await syncManager.getSyncProgress();
      
      if (!countError && processed >= (count || 0)) {
        await syncManager.completeSyncProgress();
      } else {
        await syncManager.updateSyncProgress({
          needsContinuation: true
        });
      }
    } else {
      await syncManager.updateSyncProgress({
        needsContinuation: true
      });
    }

    return new Response(
      JSON.stringify({
        message: 'Pet policy analysis initiated',
        totalAirlines: airlines.length,
        processedCount: totalProcessed,
        updatedCount: totalUpdated,
        nextOffset: offset + totalProcessed
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({
        error: error.message || 'An unexpected error occurred'
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
