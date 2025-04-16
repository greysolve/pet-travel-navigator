
import { useState, useEffect } from "react";
import { HeroSection } from "@/components/HeroSection";
import { SearchSection } from "@/components/SearchSection";
import { ResultsSection } from "@/components/ResultsSection";
import { useIsMobile } from "@/hooks/use-mobile";
import type { FlightData, PetPolicy } from "@/components/flight-results/types";

const Index = () => {
  const [searchPerformed, setSearchPerformed] = useState(false);
  const [flights, setFlights] = useState<FlightData[]>([]);
  const [petPolicies, setPetPolicies] = useState<Record<string, PetPolicy> | undefined>(undefined);
  const [apiProvider, setApiProvider] = useState<string | undefined>(undefined);
  const [apiError, setApiError] = useState<string | undefined>(undefined);
  const isMobile = useIsMobile();

  const handleSearchResults = (
    flightResults: FlightData[], 
    policies?: Record<string, PetPolicy>,
    provider?: string,
    error?: string
  ) => {
    setSearchPerformed(true);
    setFlights(flightResults);
    setPetPolicies(policies);
    setApiProvider(provider);
    setApiError(error);
  };
  
  // Safe scrolling effect that runs after the state updates and component re-renders
  useEffect(() => {
    if (searchPerformed && (flights.length > 0 || (petPolicies && Object.keys(petPolicies).length > 0))) {
      // Small timeout to ensure DOM is fully updated
      setTimeout(() => {
        const resultsElement = document.getElementById('search-results');
        if (resultsElement) {
          resultsElement.scrollIntoView({ behavior: 'smooth' });
          console.log('Scrolling to search results');
        } else {
          console.log('Search results element not found');
        }
      }, 100);
    }
  }, [searchPerformed, flights, petPolicies]);

  return (
    <div className="min-h-screen bg-gray-50">
      <HeroSection />
      <SearchSection onSearchResults={handleSearchResults} />
      <ResultsSection 
        searchPerformed={searchPerformed} 
        flights={flights} 
        petPolicies={petPolicies}
        isMobile={isMobile}
        apiProvider={apiProvider}
        apiError={apiError}
      />
    </div>
  );
};

export default Index;
