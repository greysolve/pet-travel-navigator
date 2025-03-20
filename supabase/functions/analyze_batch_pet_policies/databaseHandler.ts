
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0'
import { Airline } from './types.ts';

/**
 * Saves the processed pet policy data to the database and updates the airline record
 * 
 * @param supabase Supabase client
 * @param airline Airline object
 * @param petPolicy Processed pet policy data
 */
export async function savePetPolicyToDatabase(
  supabase: ReturnType<typeof createClient>,
  airline: Airline,
  petPolicy: any
): Promise<void> {
  console.log(`Saving pet policy for airline ${airline.name}`);

  try {
    // First, check if a policy already exists
    const { data: existingPolicy, error: fetchError } = await supabase
      .from('pet_policies')
      .select('id')
      .eq('airline_id', airline.id)
      .maybeSingle();

    if (fetchError) {
      console.error(`Error checking for existing policy: ${fetchError.message}`);
      throw fetchError;
    }

    // Common data to be inserted/updated
    const policyData = {
      airline_id: airline.id,
      pet_types_allowed: petPolicy.pet_types_allowed,
      size_restrictions: petPolicy.size_restrictions,
      carrier_requirements_cabin: petPolicy.carrier_requirements_cabin,
      carrier_requirements_cargo: petPolicy.carrier_requirements_cargo,
      documentation_needed: petPolicy.documentation_needed,
      fees: petPolicy.fees,
      temperature_restrictions: petPolicy.temperature_restrictions,
      breed_restrictions: petPolicy.breed_restrictions,
      policy_url: petPolicy.policy_url,
      citations: petPolicy.citations || null // Store citation information if available
    };

    let policyResult;
    if (existingPolicy) {
      // Update existing policy
      console.log(`Updating existing pet policy for airline ${airline.name}`);
      
      const { data, error } = await supabase
        .from('pet_policies')
        .update(policyData)
        .eq('id', existingPolicy.id)
        .select();
      
      if (error) {
        console.error(`Error updating pet policy: ${error.message}`);
        throw error;
      }
      
      policyResult = data;
    } else {
      // Insert new policy
      console.log(`Creating new pet policy for airline ${airline.name}`);
      
      const { data, error } = await supabase
        .from('pet_policies')
        .insert(policyData)
        .select();
      
      if (error) {
        console.error(`Error creating pet policy: ${error.message}`);
        throw error;
      }
      
      policyResult = data;
    }

    // Update the airline record with policy URL and timestamp
    console.log(`Updating airline ${airline.name} with last_policy_update timestamp`);
    
    const airlineUpdateData: any = {
      last_policy_update: new Date().toISOString()
    };

    // Add website URL if found
    if (petPolicy.official_website) {
      airlineUpdateData.website = petPolicy.official_website;
    }

    const { error: airlineUpdateError } = await supabase
      .from('airlines')
      .update(airlineUpdateData)
      .eq('id', airline.id);

    if (airlineUpdateError) {
      console.error(`Error updating airline: ${airlineUpdateError.message}`);
      throw airlineUpdateError;
    }

    console.log(`Successfully saved pet policy for airline ${airline.name}`);
  } catch (error) {
    console.error(`Error in savePetPolicyToDatabase: ${error.message}`);
    throw error;
  }
}
