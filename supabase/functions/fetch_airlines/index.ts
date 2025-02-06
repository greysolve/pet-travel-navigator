
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const BATCH_SIZE = 25;
const MAX_RETRIES = 3;
const BATCH_DELAY = 200; // ms between batches
const REQUEST_TIMEOUT = 15000; // 15 seconds

interface Airline {
  name: string;
  iata_code: string;
  website?: string;
  country?: string;
}

async function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

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

async function processBatchWithRetry(
  airlines: Airline[], 
  supabase: any, 
  retryCount = 0
): Promise<{ success: number; errors: string[] }> {
  try {
    console.log(`Processing batch of ${airlines.length} airlines, attempt ${retryCount + 1}`);
    
    const startTime = Date.now();
    const { error } = await supabase
      .from('airlines')
      .upsert(
        airlines.map(airline => ({
          ...airline,
          active: true,
          updated_at: new Date().toISOString(),
        })),
        { onConflict: 'iata_code' }
      );

    if (error) throw error;

    const processTime = Date.now() - startTime;
    console.log(`Batch processed successfully in ${processTime}ms`);
    
    return { success: airlines.length, errors: [] };
  } catch (error) {
    console.error(`Error processing batch, attempt ${retryCount + 1}:`, error);
    
    if (retryCount < MAX_RETRIES) {
      console.log(`Retrying batch after delay...`);
      await delay(Math.pow(2, retryCount) * 1000); // Exponential backoff
      return processBatchWithRetry(airlines, supabase, retryCount + 1);
    }
    
    return {
      success: 0,
      errors: airlines.map(airline => 
        `Failed to process ${airline.iata_code}: ${error.message}`
      )
    };
  }
}

async function fetchAirlineFromCirium(iataCode: string | null, credentials: { appId: string, appKey: string }) {
  const url = iataCode
    ? `https://api.flightstats.com/flex/airlines/rest/v1/json/iata/${iataCode}`
    : 'https://api.flightstats.com/flex/airlines/rest/v1/json/active';

  console.log(`Fetching airlines from Cirium API: ${url}`);
  
  const response = await fetchWithTimeout(url, {
    headers: {
      'appId': credentials.appId,
      'appKey': credentials.appKey,
    },
    timeout: REQUEST_TIMEOUT
  });

  if (!response.ok) {
    throw new Error(`Cirium API error: ${response.statusText}`);
  }

  const data = await response.json();
  if (iataCode) {
    // Single airline response has a different structure
    return data.airline ? [data.airline] : [];
  }
  return data.airlines || [];
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const CIRIUM_APP_ID = Deno.env.get('CIRIUM_APP_ID')
    const CIRIUM_APP_KEY = Deno.env.get('CIRIUM_APP_KEY')
    
    if (!CIRIUM_APP_ID || !CIRIUM_APP_KEY) {
      throw new Error('Missing Cirium API credentials')
    }

    // Parse request body for iataCode
    let requestBody;
    try {
      requestBody = await req.json();
    } catch {
      requestBody = {};
    }
    const { iataCode = null } = requestBody;

    console.log(`Processing request for ${iataCode ? `airline ${iataCode}` : 'all airlines'}`);

    const rawAirlines = await fetchAirlineFromCirium(
      iataCode,
      { appId: CIRIUM_APP_ID, appKey: CIRIUM_APP_KEY }
    );

    const airlines: Airline[] = rawAirlines
      .filter((airline: any) => airline.iata)
      .map((airline: any) => ({
        name: airline.name,
        iata_code: airline.iata,
        website: airline.website || null,
        country: airline.country || null,
      }));

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    console.log(`Processing ${airlines.length} airlines${iataCode ? ' for update' : ''}`);

    let processedCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    // For single airline updates, process directly
    if (iataCode) {
      const { success, errors: batchErrors } = await processBatchWithRetry(airlines, supabase);
      processedCount = success;
      errors.push(...batchErrors);
      errorCount = batchErrors.length;
    } else {
      // Process airlines in batches for full sync
      for (let i = 0; i < airlines.length; i += BATCH_SIZE) {
        const batch = airlines.slice(i, i + BATCH_SIZE);
        console.log(`Processing batch ${Math.floor(i/BATCH_SIZE) + 1} of ${Math.ceil(airlines.length/BATCH_SIZE)}...`);
        
        const { success, errors: batchErrors } = await processBatchWithRetry(batch, supabase);
        
        processedCount += success;
        errors.push(...batchErrors);
        errorCount += batchErrors.length;

        if (i + BATCH_SIZE < airlines.length) {
          console.log(`Waiting ${BATCH_DELAY}ms before next batch...`);
          await delay(BATCH_DELAY);
        }
      }
    }

    const summary = {
      success: true,
      total: airlines.length,
      processed: processedCount,
      errors: errorCount,
      errorDetails: errors,
    }

    console.log('Sync complete:', summary)

    return new Response(JSON.stringify(summary), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        errorDetails: error.stack 
      }), 
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})
