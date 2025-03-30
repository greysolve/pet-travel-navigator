import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0'
import { corsHeaders } from '../_shared/cors.ts'
import { SyncManager } from '../_shared/SyncManager.ts'
import { processPetPoliciesBatch } from './petPolicyProcessor.ts'

interface SyncRequest {
  resumeSync?: boolean;
  mode?: 'clear' | 'update';
  offset?: number;
  limit?: number;
  forceContentComparison?: boolean;
  compareContent?: boolean;
  airlines?: string[]; // Array of airline IDs for targeted processing
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
      compareContent = false,
      airlines = undefined
    } = requestData;

    console.log('Analyzing pet policies with params:', { 
      resumeSync, 
      mode, 
      offset,
      forceContentComparison,
      compareContent,
      targetedAirlines: airlines ? airlines.length : 0
    });

    // Clear existing data if requested
    if (mode === 'clear' && !resumeSync && !airlines) {
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

    // Initialize or resume sync progress - always do this regardless of specificAirlines
    let airlinesCount = 0;
    
    if (resumeSync) {
      console.log('Resuming sync progress...');
      
      // Get the current state to ensure we're using the right offset
      const currentState = await syncManager.getCurrentProgress();
      console.log('Current sync state:', currentState);
      
      // If we have processed count in the state, use it as the next offset
      // Otherwise, stay with the provided offset
      if (currentState && currentState.processed > offset) {
        console.log(`Updating offset from ${offset} to ${currentState.processed} based on processed count`);
        // Update the offset to match the processed count
        offset = currentState.processed;
      }
      
      await syncManager.continueSyncProgress();
    } else {
      // Get count of airlines to process - either specific ones or filtered by criteria
      if (airlines && airlines.length > 0) {
        airlinesCount = airlines.length;
        console.log(`Initializing sync with ${airlinesCount} specific airlines`);
      } else {
        // Count total airlines for progress tracking based on the same filtering
        let countQuery = supabase
          .from('airlines')
          .select('*', { count: 'exact', head: true });
          
        // Apply the same filtering logic as the main query in processor
        if (!forceContentComparison) {
          countQuery = countQuery.or(
            'last_policy_update.is.null,' +
            'last_policy_update.lt.now()-interval\'30 days\''
          );
        } else {
          // No filtering when force comparing - count all active airlines
          countQuery = countQuery.eq('active', true);
        }
        
        const { count, error: countError } = await countQuery;
        
        if (countError) {
          throw new Error(`Failed to count airlines: ${countError.message}`);
        }
        
        airlinesCount = count || 0;
        console.log(`Initializing sync with total count: ${airlinesCount}`);
      }
      
      await syncManager.initialize(airlinesCount);
    }

    // Process the current batch of airlines
    const result = await processPetPoliciesBatch(
      supabase,
      syncManager,
      offset,
      limit,
      compareContent,
      forceContentComparison,
      airlines
    );

    return new Response(
      JSON.stringify(result.data),
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
        error: error.message || 'An unexpected error occurred',
        needsContinuation: true, // Allow continuation even on error
        nextOffset: (parseInt(error.offset) || 0) + 1 // Move forward to avoid getting stuck
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
