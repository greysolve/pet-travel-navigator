
import { corsHeaders } from '../_shared/cors.ts';
import { handleAnalysisRequest } from './requestHandler.ts';

Deno.serve(async (req) => {
  // This is a preflight request, respond appropriately
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        ...corsHeaders,
        'Access-Control-Max-Age': '86400',
      },
    });
  }

  // Handle the actual request
  try {
    return await handleAnalysisRequest(req);
  } catch (error) {
    console.error('Fatal error in analyze_countries_policies:', error);
    return new Response(
      JSON.stringify({
        error: error.message,
        details: error instanceof Error ? error.stack : undefined
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
