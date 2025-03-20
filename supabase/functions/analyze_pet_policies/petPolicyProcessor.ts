
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0'
import { SyncManager } from '../_shared/SyncManager.ts'
import { analyzePetPolicy } from '../analyze_batch_pet_policies/openAIClient.ts'

export async function processPetPoliciesBatch(
  supabase: ReturnType<typeof createClient>,
  syncManager: SyncManager,
  offset: number = 0,
  limit: number = 10,
  compareContent: boolean = false,
  forceContentComparison: boolean = false,
  specificAirlines?: string[]
) {
  console.log(`Processing pet policies batch with offset ${offset}, limit ${limit}`);
  console.log(`Compare content: ${compareContent}, Force comparison: ${forceContentComparison}`);
  
  try {
    // Fetch API key from environment
    const openaiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiKey) {
      throw new Error('OpenAI API key not found in environment variables');
    }

    // Query to get airlines to process
    let query = supabase.from('airlines').select('*');
    
    // Handle specific airlines case
    if (specificAirlines && specificAirlines.length > 0) {
      console.log(`Processing specific airlines: ${specificAirlines.join(', ')}`);
      query = query.in('id', specificAirlines);
    } else {
      // Filter for airlines that haven't been processed or need updates
      if (!forceContentComparison) {
        query = query.or(
          'last_policy_update.is.null,' +     // Never processed
          'last_policy_update.lt.now()-interval\'30 days\''  // Processed more than 30 days ago
        );
      }
      
      // Apply pagination
      query = query.range(offset, offset + limit - 1).order('id', { ascending: true });
    }
    
    const { data: airlines, error } = await query;
    
    if (error) {
      throw new Error(`Failed to fetch airlines: ${error.message}`);
    }
    
    if (!airlines || airlines.length === 0) {
      console.log('No airlines to process');
      
      // If this was a paginated request and we've reached the end, mark sync as complete
      if (!specificAirlines && offset > 0) {
        await syncManager.completeSync();
      }
      
      return { data: { success: true, message: 'No airlines to process', needsContinuation: false } };
    }
    
    console.log(`Found ${airlines.length} airlines to process`);
    
    // Process each airline
    const processedAirlines = [];
    const errorAirlines = [];
    let needsContinuation = false;
    
    for (const airline of airlines) {
      try {
        console.log(`Processing airline: ${airline.name} (${airline.iata_code})`);
        
        // Call batch processor edge function
        const { data, error } = await supabase.functions.invoke('analyze_batch_pet_policies', {
          body: { airlines: [airline] }
        });
        
        if (error) {
          console.error(`Error processing ${airline.name}: ${error.message}`);
          errorAirlines.push(`${airline.iata_code} - ${error.message}`);
          continue;
        }
        
        if (!data.success) {
          console.error(`Failed to process ${airline.name}: ${data.error || 'Unknown error'}`);
          errorAirlines.push(`${airline.iata_code} - Processing failed`);
          continue;
        }

        // Check if content changed (if we're doing content comparison)
        if (compareContent && data.content_changed) {
          console.log(`Content changed for ${airline.name}`);
        }
        
        // Log success
        console.log(`Successfully processed ${airline.name}`);
        processedAirlines.push(`${airline.iata_code} - ${airline.name}`);
        
        // Update sync progress if not processing specific airlines
        if (!specificAirlines) {
          await syncManager.incrementProgress(airline.iata_code);
        }
        
        // Add delay between API calls to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (airlineError) {
        console.error(`Error processing airline ${airline.name}: ${airlineError.message}`);
        errorAirlines.push(`${airline.iata_code} - ${airlineError.message}`);
      }
    }
    
    // Determine if we need to continue processing more airlines
    if (!specificAirlines) {
      const { data: remainingCount, error: countError } = await supabase
        .from('airlines')
        .select('id', { count: 'exact', head: true })
        .or(
          'last_policy_update.is.null,' +
          'last_policy_update.lt.now()-interval\'30 days\''
        )
        .gt('id', airlines[airlines.length - 1].id);
      
      if (!countError && remainingCount !== null && remainingCount > 0) {
        console.log(`${remainingCount} more airlines need processing`);
        needsContinuation = true;
        
        // Update sync state to indicate continuation is needed
        await syncManager.updateSyncState({
          needs_continuation: true,
          last_processed: airlines[airlines.length - 1].id
        });
      } else if (!countError) {
        console.log('All airlines processed, completing sync');
        await syncManager.completeSync();
      }
    }
    
    // Return results
    return {
      data: {
        success: true,
        processed: processedAirlines.length,
        errors: errorAirlines.length,
        processedAirlines,
        errorAirlines,
        needsContinuation,
        nextOffset: offset + limit
      }
    };
  } catch (error) {
    console.error('Error in processPetPoliciesBatch:', error);
    
    // Update sync state to record error but allow continuation
    if (syncManager) {
      await syncManager.updateSyncState({
        error_items: [`Batch error at offset ${offset}: ${error.message}`],
        needs_continuation: true
      });
    }
    
    return {
      data: {
        success: false,
        error: error.message,
        needsContinuation: true,
        nextOffset: offset
      }
    };
  }
}
