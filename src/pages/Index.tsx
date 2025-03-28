import { useState } from "react";
import { Card } from "@/components/ui/card";
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
  const { isMobile } = useIsMobile();

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
    
    // Scroll to results if we have any
    if (flightResults.length > 0 || (policies && Object.keys(policies).length > 0)) {
      const resultsElement = document.getElementById('search-results');
      if (resultsElement) {
        resultsElement.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <HeroSection />
      <section className="py-10 md:py-16">
        <div className="container mx-auto px-4">
          <Card className="p-6 shadow-lg bg-white/90 backdrop-blur-sm">
            <SearchSection onSearchResults={handleSearchResults} />
          </Card>
        </div>
      </section>
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
