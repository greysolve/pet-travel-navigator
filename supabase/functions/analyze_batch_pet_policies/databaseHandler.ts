
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
 */
export async function savePetPolicyToDatabase(
  supabase: ReturnType<typeof createClient>,
  airline: Airline,
  petPolicy: PetPolicyData
): Promise<void> {
  console.log(`Saving pet policy for ${airline.name} to database`);
  
  // Prepare policy data with just the specific pet policy URL
  const policyData = {
    airline_id: airline.id,
    ...petPolicy,
    // We don't include official_website in the pet_policies table
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
  
  // Also update the last_policy_update timestamp to track when we last processed this airline
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

  // Comment out the missing_pet_policies section since this table doesn't exist
  // and was causing errors in the logs
  /*
  // Remove from missing_pet_policies if we have a policy URL
  if (petPolicy.policy_url) {
    const { error: deleteError } = await supabase
      .from('missing_pet_policies')
      .delete()
      .eq('iata_code', airline.iata_code);

    if (deleteError) {
      console.error(`Error removing from missing_pet_policies: ${deleteError.message}`);
    }
  }
  */
}
