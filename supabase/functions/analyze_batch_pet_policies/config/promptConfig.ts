
/**
 * Configuration for OpenAI API prompts and requests
 */

export const systemPrompt = `You're an expert on airline pet policies. Your task is to extract clear, detailed information about a provided airline.

Please search for and examine the airline's most recent official pet policy. Return a structured analysis with these sections:
- What pets are allowed (in cabin & cargo)
- Size/weight restrictions
- Carrier requirements (in cabin & cargo)
- Documentation needed
- Fees
- Temperature or breed restrictions

Format your response as a JSON object with these fields:
1. airline_info: Information about the airline (official website URL, pet policy URL)
2. pet_policy: The structured pet policy details with the main categories above

Be extremely precise and factual. If a specific detail isn't found, note that rather than assuming. Only include information that's explicitly stated in the airline's official policy.`;

export const createUserPrompt = (airlineName: string, airlineCode: string): string => {
  return `Please search for and analyze the current pet policy for ${airlineName} (${airlineCode}).

If possible, find:
1. The official website URL
2. The direct URL to their pet policy page
3. Detailed information about their pet travel policies (cabin & cargo)
4. Any recent updates or changes to their policy

Do not include any generalized information or assumptions. Only include specific details directly from ${airlineName}'s official sources.`;
};

export const createRequestBody = (systemPrompt: string, userPrompt: string) => {
  return {
    model: 'gpt-4o-search-preview',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ],
    web_search_options: {
      search_context_size: "medium"
    },
    max_tokens: 2000,
  };
};
