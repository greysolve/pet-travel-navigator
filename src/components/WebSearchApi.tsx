
import { useEffect, useState } from "react";

interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}

export const useWebSearch = (query: string) => {
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchResults = async () => {
      if (!query.trim()) {
        setResults([]);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        // Real API call to your backend or directly to a search API
        const response = await fetch(`/api/web-search?q=${encodeURIComponent(query)}`);
        
        if (!response.ok) {
          throw new Error('Search failed. Please try again later.');
        }
        
        const data = await response.json();
        setResults(data.results || []);
      } catch (err) {
        console.error('Search failed:', err);
        setError('Failed to perform search. Please try again.');
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchResults();
  }, [query]);

  return { results, isLoading, error };
};
