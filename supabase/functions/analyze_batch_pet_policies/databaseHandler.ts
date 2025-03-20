
/**
 * Handles database operations for pet policy data
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0';
import { Airline, PetPolicyData } from './types.ts';

/**
 * Saves pet policy data to the database
 * @param supabase Supabase client instance
 * @param airline Airline data
 * @param petPolicy Pet policy data
 * @param forceUpdate Whether to force update regardless of last_policy_update
 */
export async function savePetPolicyToDatabase(
  supabase: ReturnType<typeof createClient>,
  airline: Airline,
  petPolicy: PetPolicyData,
  forceUpdate: boolean = false
): Promise<void> {
  console.log(`Saving pet policy for ${airline.name} to database, forceUpdate: ${forceUpdate}`);
  
  // Check if we need to update based on timestamp, unless force update is enabled
  if (!forceUpdate && airline.last_policy_update) {
    // If the airline was updated in the last 24 hours and we're not forcing an update, skip
    const lastUpdate = new Date(airline.last_policy_update);
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);
    
    if (lastUpdate > oneDayAgo) {
      console.log(`Skipping update for ${airline.name} - last updated ${lastUpdate.toISOString()}, less than 24 hours ago`);
      return;
    }
  }
  
  // Prepare policy data with just the specific pet policy URL
  const policyData = {
    airline_id: airline.id,
    ...petPolicy,
    // Format sources and confidence scores for database storage
    sources: petPolicy.sources || [],
    confidence_score: petPolicy.confidence_score || { airline_info: 0, pet_policy: 0 }
  };
  
  // Remove official_website as it shouldn't be part of the pet_policies table
  // @ts-ignore - This field exists in our data but not in the type
  delete policyData.official_website;
  
  const { error: upsertError } = await supabase
    .from('pet_policies')
    .upsert(policyData, {
      onConflict: 'airline_id'
    });

  if (upsertError) {
    throw upsertError;
  }

  // Update airline record with appropriate URLs
  const airlineUpdates: Record<string, any> = {};
  
  // Only update the airline's main website if one was found and airline doesn't already have one
  // @ts-ignore - This field exists in our data but not in the type
  if (petPolicy.official_website && !airline.website) {
    // @ts-ignore - This field exists in our data but not in the type
    airlineUpdates.website = petPolicy.official_website;
    console.log(`Updating airline ${airline.name} website to: ${petPolicy.official_website}`);
  }
  
  // Always update the last_policy_update timestamp to track when we last processed this airline
  // This is crucial for preventing reprocessing of the same airline
  airlineUpdates.last_policy_update = new Date().toISOString();
  
  // Only perform the update if we have changes to make
  if (Object.keys(airlineUpdates).length > 0) {
    const { error: airlineError } = await supabase
      .from('airlines')
      .update(airlineUpdates)
      .eq('id', airline.id);

    if (airlineError) {
      console.error(`Error updating airline data: ${airlineError.message}`);
    }
  }
}
