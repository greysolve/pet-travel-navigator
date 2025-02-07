
import { corsHeaders } from '../_shared/cors.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0';
import { SyncManager } from '../_shared/SyncManager.ts';
import { RequestBody, AnalysisResponse } from './types.ts';
import { processCountriesChunk } from './countryProcessor.ts';
import { validateAndInitializeProgress } from './progressManager.ts';

export async function handleAnalysisRequest(req: Request): Promise<Response> {
  try {
    const { mode, offset, resumeToken } = await parseRequestBody(req);
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase configuration');
    }

    console.log(`Starting country policies analysis - Mode: ${mode}, Offset: ${offset}, ResumeToken: ${resumeToken}`);
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    const syncManager = new SyncManager(supabaseUrl, supabaseKey, 'countryPolicies');

    const { count: totalCount, error: countError } = await supabase
      .from('countries')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      console.error('Error getting count:', countError);
      throw new Error(`Error getting count: ${countError.message}`);
    }

    console.log('Total count:', totalCount);

    if (!totalCount) {
      return createResponse({ 
        success: true, 
        message: 'No countries to process',
        has_more: false 
      });
    }

    await validateAndInitializeProgress(syncManager, totalCount, offset, resumeToken);

    return await processCountriesChunk(supabase, syncManager, offset, totalCount, mode);

  } catch (error) {
    console.error('Fatal error in analyze_countries_policies:', error);
    return createResponse({ 
      success: false, 
      error: error.message 
    }, 500);
  }
}

async function parseRequestBody(req: Request): Promise<{ mode: string; offset: number; resumeToken: string | null }> {
  let mode = 'clear';
  let offset = 0;
  let resumeToken = null;
  
  try {
    const body = await req.text();
    console.log('Received request body:', body);
    
    if (body) {
      const parsedBody = JSON.parse(body) as RequestBody;
      console.log('Parsed request body:', parsedBody);
      
      if (parsedBody.mode) mode = parsedBody.mode;
      if (typeof parsedBody.offset === 'number') offset = parsedBody.offset;
      if (parsedBody.resumeToken) resumeToken = parsedBody.resumeToken;
    }
  } catch (error) {
    console.error('Error parsing request body:', error);
    throw new Error('Invalid request body');
  }

  return { mode, offset, resumeToken };
}

export function createResponse(data: AnalysisResponse, status: number = 200): Response {
  return new Response(
    JSON.stringify(data),
    { 
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    }
  );
}
