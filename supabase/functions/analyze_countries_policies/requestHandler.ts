
import { corsHeaders } from '../_shared/cors.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0';
import { SyncManager } from '../_shared/SyncManager.ts';
import { processCountriesChunk } from './countryProcessor.ts';

export type AnalysisResponse = {
  data?: {
    progress?: {
      needs_continuation: boolean;
      next_offset: number | null;
    };
    [key: string]: any;
  };
  error?: {
    message: string;
  };
};

export function createResponse(response: AnalysisResponse): Response {
  return new Response(
    JSON.stringify(response),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

export async function handleAnalysisRequest(req: Request): Promise<Response> {
  try {
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    let mode = 'clear';
    let offset = 0;
    
    try {
      const body = await req.text();
      console.log('Received request body:', body);
      
      if (body) {
        const parsedBody = JSON.parse(body);
        if (parsedBody.mode) mode = parsedBody.mode;
        if (typeof parsedBody.offset === 'number') offset = parsedBody.offset;
      }
    } catch (error) {
      console.error('Error parsing request body:', error);
      return createResponse({ 
        error: { message: 'Invalid request body' }
      });
    }

    console.log(`Starting country policies analysis - Mode: ${mode}, Offset: ${offset}`);
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase configuration');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const syncManager = new SyncManager(supabaseUrl, supabaseKey, 'countryPolicies');

    // Get total count for the full table
    const { count: totalCount, error: countError } = await supabase
      .from('countries')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      console.error('Error getting count:', countError);
      throw new Error(`Error getting count: ${countError.message}`);
    }

    console.log(`Total countries count: ${totalCount}`);

    if (!totalCount) {
      console.log('No countries found, marking as completed with no continuation needed');
      return createResponse({ 
        data: {
          progress: {
            needs_continuation: false,
            next_offset: null
          }
        }
      });
    }

    // Check for existing sync in progress first
    const currentProgress = await syncManager.getCurrentProgress();
    console.log('Current progress from database:', currentProgress);
    
    // Initialize sync progress only when starting from beginning
    if (offset === 0 && !currentProgress) {
      console.log(`Initializing new sync progress with total count: ${totalCount}`);
      await syncManager.initialize(totalCount);
    } else if (offset === 0 && currentProgress) {
      // If starting new sync but there's existing progress, check if it needs continuation
      if (currentProgress.needs_continuation) {
        console.log('Found incomplete sync, continuing from last position:', currentProgress);
        // Use processed count as offset to continue from where we left off
        offset = currentProgress.processed;
        console.log(`Setting offset to ${offset} based on processed count`);
      } else {
        // Reinitialize for new sync
        console.log('Reinitializing sync progress for new sync');
        await syncManager.initialize(totalCount);
      }
    } else {
      // For non-zero offset, validate against existing progress
      if (!currentProgress) {
        console.error('No sync progress found for non-zero offset:', offset);
        throw new Error('No sync progress found for non-zero offset');
      }
      if (currentProgress.total !== totalCount) {
        console.warn(`Total count mismatch. Current: ${currentProgress.total}, New: ${totalCount}. Using existing total.`);
      }
      console.log(`Continuing with existing progress at offset ${offset}:`, currentProgress);
    }

    return await processCountriesChunk(supabase, syncManager, offset, mode);

  } catch (error) {
    console.error('Fatal error in analyze_countries_policies:', error);
    return createResponse({ 
      error: { message: error.message }
    });
  }
}

export type RequestBody = {
  mode?: string;
  offset?: number;
  resumeToken?: string | null;
};
