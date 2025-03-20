
/**
 * Core functionality for analyzing airline pet policies
 */

import { Airline } from '../types.ts';
import { systemPrompt, createUserPrompt } from '../config/promptConfig.ts';
import { makeOpenAIRequest } from './apiService.ts';
import { parseJsonContent, normalizePetPolicyData } from '../utils/dataHelpers.ts';

/**
 * Analyzes an airline's pet policy using OpenAI with web search
 */
export async function analyzePetPolicy(airline: Airline, openaiKey: string): Promise<any> {
  console.log(`Analyzing pet policy for ${airline.name} (${airline.iata_code})`);
  
  const userPrompt = createUserPrompt(airline.name, airline.iata_code);

  const maxRetries = 3;
  let lastError = null;
  let rawResponse = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Attempt ${attempt} to get policy from OpenAI API with web search`);
      
      // Make the API request
      const content = await makeOpenAIRequest(systemPrompt, userPrompt, openaiKey);
      
      console.log('=== CONTENT PROCESSING ===');
      console.log('Raw content length:', content.length);
      console.log('First 200 characters of raw content:', content.substring(0, 200));
      
      // Save the raw API response first, before any processing
      rawResponse = content;
      
      try {
        // Parse the content into a structured object
        const parsedData = parseJsonContent(content);
        console.log('Successfully parsed content');
        
        // Extract and normalize the data
        const normalizedData = normalizePetPolicyData(parsedData, rawResponse);
        
        console.log('=== PARSED DATA SUCCESSFULLY ===');
        console.log('Successfully parsed and normalized policy data');
        console.log('Breed restrictions (should be array):', normalizedData.breed_restrictions);
        
        return normalizedData;
        
      } catch (parseError) {
        console.error('Failed to parse API response after all attempts. Error:', parseError.message);
        console.error('First 200 chars of content that failed to parse:', content.substring(0, 200));
        
        // Return an object with parsing_failed flag and the raw response
        return {
          _parsing_failed: true,
          _raw_api_response: rawResponse,
          error_message: `Failed to parse response: ${parseError.message}`
        };
      }

    } catch (error) {
      console.error(`Attempt ${attempt} failed:`, error);
      lastError = error;
      
      if (attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 1000;
        console.log(`Waiting ${delay}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        // Create an error object that includes the raw response if available
        const errorWithResponse = {
          _parsing_failed: true,
          _raw_api_response: rawResponse,
          error_message: `Failed after ${maxRetries} attempts: ${lastError.message}`
        };
        console.log('Returning error with raw response:', !!rawResponse);
        return errorWithResponse;
      }
    }
  }

  // Should never reach here, but just in case
  return {
    _parsing_failed: true,
    _raw_api_response: rawResponse,
    error_message: `Failed after ${maxRetries} attempts: ${lastError ? lastError.message : "Unknown error"}`
  };
}
