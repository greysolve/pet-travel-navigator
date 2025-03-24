
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Search } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}

const WebSearch = () => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isMobile = useIsMobile();

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!query.trim()) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/web-search?q=${encodeURIComponent(query)}`);
      
      if (!response.ok) {
        throw new Error('Search failed. Please try again later.');
      }
      
      const data = await response.json();
      setResults(data.results || []);
    } catch (err) {
      console.error('Search error:', err);
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F1F0FB] py-8">
      <div className="container mx-auto px-4">
        <h1 className="text-3xl font-bold mb-8 text-center">Pet Travel Web Search</h1>
        
        <div className="max-w-3xl mx-auto bg-white rounded-lg shadow-lg p-6">
          <form onSubmit={handleSearch} className="mb-6">
            <div className="flex flex-col md:flex-row gap-3">
              <Input
                type="text"
                placeholder="Search for pet travel information..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="flex-1"
              />
              <Button type="submit" disabled={isLoading} className="md:w-auto w-full">
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    Searching...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Search className="h-4 w-4" />
                    Search
                  </span>
                )}
              </Button>
            </div>
          </form>

          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6">
              <p className="text-red-700">{error}</p>
            </div>
          )}

          <div className="space-y-6">
            {isLoading ? (
              // Loading skeletons
              Array(3).fill(0).map((_, i) => (
                <div key={i} className="animate-pulse">
                  <Skeleton className="h-6 w-3/4 mb-2" />
                  <Skeleton className="h-4 w-full mb-1" />
                  <Skeleton className="h-4 w-5/6" />
                </div>
              ))
            ) : results.length > 0 ? (
              // Search results
              results.map((result, index) => (
                <div key={index} className="border-b pb-4 last:border-b-0">
                  <h2 className="text-lg font-medium text-blue-600 hover:underline">
                    <a href={result.url} target="_blank" rel="noopener noreferrer">
                      {result.title}
                    </a>
                  </h2>
                  <p className="text-sm text-gray-600 mb-1">{result.url}</p>
                  <p className="text-sm">{result.snippet}</p>
                </div>
              ))
            ) : query.trim() !== "" ? (
              // No results state
              <div className="text-center py-8">
                <p className="text-gray-500">No results found for "{query}"</p>
                <p className="text-sm text-gray-400 mt-2">Try different keywords or phrases</p>
              </div>
            ) : null}
          </div>
        </div>
        
        <div className="mt-8 max-w-3xl mx-auto">
          <h2 className="text-xl font-semibold mb-4">Popular Pet Travel Topics</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {popularTopics.map((topic, index) => (
              <div 
                key={index} 
                className="bg-white rounded-lg shadow p-4 hover:bg-primary/5 cursor-pointer transition-colors"
                onClick={() => {
                  setQuery(topic);
                  document.querySelector<HTMLFormElement>('form')?.requestSubmit();
                }}
              >
                <h3 className="font-medium">{topic}</h3>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const popularTopics = [
  "Pet quarantine requirements by country",
  "Best airlines for pet travel",
  "Pet travel documentation needed",
  "Airlines that allow pets in cabin",
  "Pet-friendly hotels",
  "Pet travel health certificates",
  "International pet travel regulations",
  "Flying with emotional support animals"
];

export default WebSearch;
