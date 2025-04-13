
/**
 * Service for searching the web for flight information
 */

export async function searchWebForFlights(origin: string, destination: string, date: string, apiKey: string): Promise<any> {
  console.log(`Searching web for flights from ${origin} to ${destination} on ${date}`);
  
  try {
    // Format the query to get useful flight information
    const query = `Find the most up-to-date flight information from ${origin} to ${destination} on ${date}. Include information about airlines, prices, frequency, typical duration, and any recent schedule changes or disruptions. Format as a concise summary.`;
    
    // Call Perplexity API for web search
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'pplx-7b-online',
        messages: [
          {
            role: 'system',
            content: 'You are an AI assistant that helps find accurate, up-to-date flight information. Provide only factual information about flights, with no speculation. Include source citations where possible.'
          },
          {
            role: 'user',
            content: query
          }
        ],
        options: {
          web_search: true
        }
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Web search API error: ${response.status} ${errorText}`);
    }
    
    const data = await response.json();
    
    // Extract the response and citations
    return {
      summary: data.choices[0].message.content,
      citations: data.choices[0].message.annotations,
      api_provider: 'perplexity',
      web_search_used: true
    };
  } catch (error) {
    console.error('Error in web search service:', error);
    return {
      error: error instanceof Error ? error.message : String(error),
      web_search_used: true
    };
  }
}
