
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Search } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useWebSearch } from "@/components/WebSearchApi";
import { PolicyFilterContainer } from "@/components/policy-filter/PolicyFilterContainer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FilteredPolicyResult } from "@/types/policy-filters";

const WebSearch = () => {
  const [query, setQuery] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const { results, isLoading, error } = useWebSearch(searchQuery);
  const isMobile = useIsMobile();
  const [activeTab, setActiveTab] = useState<string>("web");
  const [filteredAirlines, setFilteredAirlines] = useState<FilteredPolicyResult[]>([]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      setSearchQuery(query);
    }
  };

  const handleFilterResults = (results: FilteredPolicyResult[]) => {
    setFilteredAirlines(results);
  };

  return (
    <div className="min-h-screen bg-[#F1F0FB] py-8">
      <div className="container mx-auto px-4">
        <h1 className="text-3xl font-bold mb-8 text-center">Pet Travel Resources</h1>
        
        <div className="max-w-3xl mx-auto">
          <Tabs defaultValue="web" value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="web">Web Search</TabsTrigger>
              <TabsTrigger value="policy">Policy Filters</TabsTrigger>
            </TabsList>
            
            <TabsContent value="web" className="bg-white rounded-lg shadow-lg p-6">
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
                ) : searchQuery.trim() !== "" ? (
                  // No results state
                  <div className="text-center py-8">
                    <p className="text-gray-500">No results found for "{searchQuery}"</p>
                    <p className="text-sm text-gray-400 mt-2">Try different keywords or phrases</p>
                  </div>
                ) : null}
              </div>
            </TabsContent>
            
            <TabsContent value="policy" className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-xl font-semibold mb-4">Find Pet-Friendly Airlines</h2>
              <p className="text-gray-600 mb-6">
                Use filters to find airlines with pet policies that meet your requirements.
              </p>
              
              <PolicyFilterContainer onFilterResults={handleFilterResults} />
            </TabsContent>
          </Tabs>
        </div>
        
        <div className="mt-8 max-w-3xl mx-auto">
          <h2 className="text-xl font-semibold mb-4">Popular Pet Travel Topics</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {popularTopics.map((topic, index) => (
              <div 
                key={index} 
                className="bg-white rounded-lg shadow p-4 hover:bg-primary/5 cursor-pointer transition-colors"
                onClick={() => {
                  if (activeTab === "web") {
                    setQuery(topic);
                    setSearchQuery(topic);
                  } else {
                    setActiveTab("web");
                    setTimeout(() => {
                      setQuery(topic);
                      setSearchQuery(topic);
                    }, 100);
                  }
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
