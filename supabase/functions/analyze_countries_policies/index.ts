
import { corsHeaders } from '../_shared/cors.ts';
import { handleAnalysisRequest } from './requestHandler.ts';

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

  return handleAnalysisRequest(req);
});
