
/**
 * Firecrawl API client for website scraping
 */

const FIRECRAWL_API_URL = 'https://api.firecrawl.dev/api/v1/crawl';

/**
 * Scrape a website using Firecrawl API
 * @param url URL to scrape
 * @param apiKey Firecrawl API key
 * @returns Processed content from the website
 */
export async function scrapeWebsite(url: string, apiKey: string): Promise<string> {
  console.log(`Scraping website: ${url}`);
  
  if (!url) {
    throw new Error('No URL provided for scraping');
  }
  
  if (!apiKey) {
    throw new Error('Firecrawl API key is missing');
  }
  
  try {
    const response = await fetch(FIRECRAWL_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        url: url,
        limit: 10, // Limit to 10 pages to save credits
        wait: 1000,
        scrapeOptions: {
          formats: ['markdown']
        }
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Firecrawl API error: ${response.status} - ${errorText}`);
    }
    
    const data = await response.json();
    if (!data.success) {
      throw new Error(data.message || 'Failed to scrape website');
    }
    
    console.log(`Scrape successful, found ${data.pages?.length || 0} pages`);
    
    // Extract content from all pages into a single string
    let content = '';
    if (data.pages && Array.isArray(data.pages)) {
      content = data.pages.map((page: any) => {
        return `# ${page.title || 'Untitled Page'}\n${page.content?.markdown || ''}`;
      }).join('\n\n');
    }
    
    return content;
  } catch (error) {
    console.error('Error scraping website:', error);
    throw error;
  }
}
