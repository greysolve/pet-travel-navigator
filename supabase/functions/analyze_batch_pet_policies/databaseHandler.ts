
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0'
import { Airline } from './types.ts';
import { hasPolicyContentChanged } from '../../src/utils/policyContentSignature.ts';

/**
 * Saves the processed pet policy data to the database and updates the airline record
 * 
 * @param supabase Supabase client
 * @param airline Airline object
 * @param petPolicy Processed pet policy data
 * @param rawApiResponse Raw API response text for debugging
 * @returns Object with update status and additional information
 */
export async function savePetPolicyToDatabase(
  supabase: ReturnType<typeof createClient>,
  airline: Airline,
  petPolicy: any,
  rawApiResponse?: string
): Promise<{
  updated: boolean;
  content_changed: boolean;
  raw_api_response?: string;
  comparison_details?: any;
}> {
  console.log(`Saving pet policy for airline ${airline.name}`);
  const result = {
    updated: false,
    content_changed: false,
    raw_api_response: rawApiResponse,
    comparison_details: null
  };

  try {
    // First, check if a policy already exists
    const { data: existingPolicy, error: fetchError } = await supabase
      .from('pet_policies')
      .select('*')
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
      policy_url: petPolicy.policy_url
    };

    // Check if content has changed (important for updating timestamp)
    const contentChanged = !existingPolicy || hasPolicyContentChanged(existingPolicy, policyData);
    result.content_changed = contentChanged;
    
    // Store comparison details for debugging
    result.comparison_details = {
      existing_policy_id: existingPolicy?.id || null,
      has_existing_policy: !!existingPolicy,
      content_signature_changed: contentChanged,
      content_comparison: {
        existing: existingPolicy ? JSON.stringify(existingPolicy).substring(0, 100) + "..." : null,
        new: JSON.stringify(policyData).substring(0, 100) + "..."
      }
    };

    let policyResult;
    if (existingPolicy) {
      // Update existing policy if content changed
      if (contentChanged) {
        console.log(`Updating existing pet policy for airline ${airline.name} - content changed`);
        
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
        result.updated = true;
      } else {
        console.log(`No updates needed for airline ${airline.name} - content unchanged`);
      }
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
      result.updated = true;
    }

    // Update the airline record with policy URL and timestamp ONLY if content changed
    if (contentChanged) {
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
    } else {
      console.log(`Skipping airline ${airline.name} timestamp update - content unchanged`);
    }

    console.log(`Successfully processed pet policy for airline ${airline.name}, content changed: ${contentChanged}`);
    return result;
  } catch (error) {
    console.error(`Error in savePetPolicyToDatabase: ${error.message}`);
    throw error;
  }
}
