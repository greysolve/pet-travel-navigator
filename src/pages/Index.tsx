
import { useState, useRef, useEffect } from "react";
import { HeroSection } from "@/components/HeroSection";
import { SearchSection } from "@/components/SearchSection";
import { ResultsSection } from "@/components/ResultsSection";
import { useAuth } from "@/contexts/AuthContext";
import { useIsMobile } from "@/hooks/use-mobile";
import type { FlightData, PetPolicy } from "@/components/flight-results/types";

const Index = () => {
  const [searchPerformed, setSearchPerformed] = useState(false);
  const [flights, setFlights] = useState<FlightData[]>([]);
  const [petPolicies, setPetPolicies] = useState<Record<string, PetPolicy>>();
  const [apiProvider, setApiProvider] = useState<string>();
  const resultsRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const isMobile = useIsMobile();

  // Reset all search states when auth changes
  useEffect(() => {
    console.log('Auth state changed, resetting search state');
    setSearchPerformed(false);
    setFlights([]);
    setPetPolicies(undefined);
    setApiProvider(undefined);
  }, [user?.id]);

  const handleSearchResults = (
    results: FlightData[], 
    policies?: Record<string, PetPolicy>,
    provider?: string
  ) => {
    console.log('Index: received search results:', { results, policies, provider, isMobile });
    setFlights(results || []);
    setPetPolicies(policies);
    setApiProvider(provider);
    setSearchPerformed(true);

    // Scroll to results after a brief delay to ensure DOM update
    setTimeout(() => {
      console.log('Scrolling to results section');
      resultsRef.current?.scrollIntoView({ 
        behavior: 'smooth',
        block: 'start'
      });
    }, 100);
  };

  return (
    <div className="min-h-screen bg-[#F1F0FB]">
      <HeroSection />
      <SearchSection onSearchResults={handleSearchResults} />
      <div ref={resultsRef} className="scroll-mt-8">
        <ResultsSection 
          searchPerformed={searchPerformed} 
          flights={flights}
          petPolicies={petPolicies}
          isMobile={isMobile}
          apiProvider={apiProvider}
        />
      </div>
    </div>
  );
};

export default Index;
