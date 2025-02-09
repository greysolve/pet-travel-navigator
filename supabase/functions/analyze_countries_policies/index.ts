
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0'
import { SyncManager } from '../_shared/SyncManager.ts'
import { corsHeaders } from '../_shared/cors.ts'

// Reduce chunk size to prevent timeouts, same as pet policies
const CHUNK_SIZE = 5;
const DELAY_BETWEEN_COUNTRIES = 1000; // 1 second delay between countries

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
    // Validate request method
    if (req.method !== 'POST') {
      throw new Error(`Method ${req.method} not allowed`);
    }

    // Get Supabase configuration
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase configuration');
    }

    // Initialize variables
    let mode = 'clear';
    let offset = 0;
    let resumeToken = null;
    
    // Parse request body
    try {
      const body = await req.text();
      console.log('Received request body:', body);
      
      if (body) {
        const parsedBody = JSON.parse(body);
        console.log('Parsed request body:', parsedBody);
        
        if (parsedBody.mode) mode = parsedBody.mode;
        if (typeof parsedBody.offset === 'number') offset = parsedBody.offset;
        if (parsedBody.resumeToken) resumeToken = parsedBody.resumeToken;
      }
    } catch (error) {
      console.error('Error parsing request body:', error);
      throw new Error('Invalid request body');
    }

    console.log(`Starting country policies analysis - Mode: ${mode}, Offset: ${offset}, ResumeToken: ${resumeToken}`);
    
    // Initialize clients
    const supabase = createClient(supabaseUrl, supabaseKey);
    const syncManager = new SyncManager(supabaseUrl, supabaseKey, 'countryPolicies');

    // Get total count of countries first
    const { count: totalCount, error: countError } = await supabase
      .from('countries')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      console.error('Error getting count:', countError);
      throw new Error(`Error getting count: ${countError.message}`);
    }

    console.log('Total count:', totalCount);

    if (!totalCount) {
      console.log('No countries to process');
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No countries to process',
          has_more: false 
        }), 
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get current progress to determine if we need to initialize
    const currentProgress = await syncManager.getCurrentProgress();
    
    // Only initialize if there's no existing progress
    if (!currentProgress) {
      console.log(`Initializing sync progress with total count: ${totalCount}`);
      await syncManager.initialize(totalCount);
    }

    // Get batch of countries
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
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No more countries to process',
          has_more: false 
        }), 
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Processing chunk of ${countries.length} countries`);
    
    const results = [];
    const errors = [];
    const chunkStartTime = Date.now();

    // Process countries one at a time with delay
    for (const country of countries) {
      try {
        console.log(`Processing country: ${country.name}`);
        
        const response = await fetch(`${supabaseUrl}/functions/v1/sync_country_policies`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ country: country.name }),
        });

        if (!response.ok) {
          throw new Error(`Failed to process country: ${response.statusText}`);
        }

        const result = await response.json();
        console.log('Country processing result:', result);

        results.push(country.name);

        // Update progress after each country
        const currentProgress = await syncManager.getCurrentProgress();
        
        await syncManager.updateProgress({
          processed: currentProgress.processed + 1,
          last_processed: country.name,
          processed_items: [...(currentProgress.processed_items || []), country.name],
          error_items: [...(currentProgress.error_items || [])],
          needs_continuation: true
        });

        // Add delay between countries
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

    // Only set needs_continuation to false if this is the last chunk
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
    
    return new Response(
      JSON.stringify({
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
      }), 
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Fatal error in analyze_countries_policies:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }), 
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
