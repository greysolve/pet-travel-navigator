
/**
 * Service for handling OpenAI API communication
 */

import { createRequestBody } from '../config/promptConfig.ts';

export async function makeOpenAIRequest(systemPrompt: string, userPrompt: string, openaiKey: string) {
  console.log('=== API REQUEST ===');
  console.log('Sending request to OpenAI API');
  
  const requestBody = createRequestBody(systemPrompt, userPrompt);

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openaiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  console.log('=== API RESPONSE STATUS ===');
  console.log('Status:', response.status);
  console.log('Status Text:', response.statusText);
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error('API Error Response:', errorText);
    throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  console.log('=== API RESPONSE DATA ===');
  console.log('Received response from OpenAI API');

  if (!data.choices?.[0]?.message?.content) {
    console.error('Invalid response format. Response data:', data);
    throw new Error('Invalid response format from OpenAI API');
  }

  return data.choices[0].message.content.trim();
}
