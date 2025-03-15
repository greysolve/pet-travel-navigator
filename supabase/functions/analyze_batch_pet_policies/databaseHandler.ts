
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
  
  const policyData = {
    airline_id: airline.id,
    ...petPolicy,
    policy_url: airline.policy_url || petPolicy.policy_url
  };
  
  const { error: upsertError } = await supabase
    .from('pet_policies')
    .upsert(policyData, {
      onConflict: 'airline_id'
    });

  if (upsertError) {
    throw upsertError;
  }

  if (petPolicy.policy_url && !airline.policy_url) {
    const { error: airlineError } = await supabase
      .from('airlines')
      .update({ website: petPolicy.policy_url })
      .eq('id', airline.id);

    if (airlineError) {
      console.error(`Error updating airline website: ${airlineError.message}`);
    }
  }

  // Remove from missing_pet_policies if present
  if (airline.policy_url) {
    const { error: deleteError } = await supabase
      .from('missing_pet_policies')
      .delete()
      .eq('iata_code', airline.iata_code);

    if (deleteError) {
      console.error(`Error removing from missing_pet_policies: ${deleteError.message}`);
    }
  }
}
