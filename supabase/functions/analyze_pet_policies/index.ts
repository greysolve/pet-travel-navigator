
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

    // Initialize or resume sync progress
    if (resumeSync) {
      console.log('Resuming sync progress...');
      await syncManager.continueSyncProgress();
    } else {
      // Count total airlines for progress tracking
      const { count, error: countError } = await supabase
        .from('airlines')
        .select('*', { count: 'exact', head: true });
      
      if (countError) {
        throw new Error(`Failed to count airlines: ${countError.message}`);
      }
      
      console.log(`Initializing sync with total count: ${count}`);
      await syncManager.initialize(count || 0);
    }

    // Process the current batch of airlines
    const result = await processPetPoliciesBatch(
      supabase,
      syncManager,
      offset,
      limit,
      compareContent,
      forceContentComparison
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
