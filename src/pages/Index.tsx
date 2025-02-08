
import { useState, useRef } from "react";
import { HeroSection } from "@/components/HeroSection";
import { SearchSection } from "@/components/SearchSection";
import { ResultsSection } from "@/components/ResultsSection";
import type { FlightData, PetPolicy } from "@/components/flight-results/types";
import AuthDialog from "@/components/AuthDialog";

const Index = () => {
  const [searchPerformed, setSearchPerformed] = useState(false);
  const [flights, setFlights] = useState<FlightData[]>([]);
  const [petPolicies, setPetPolicies] = useState<Record<string, PetPolicy>>();
  const resultsRef = useRef<HTMLDivElement>(null);

  const handleSearchResults = (
    results: FlightData[], 
    policies?: Record<string, PetPolicy>
  ) => {
    setFlights(results);
    setPetPolicies(policies);
    setSearchPerformed(true);

    // Scroll to results after a brief delay to ensure DOM update
    setTimeout(() => {
      resultsRef.current?.scrollIntoView({ 
        behavior: 'smooth',
        block: 'start'
      });
    }, 100);
  };

  return (
    <div className="min-h-screen bg-[#F1F0FB]">
      <div className="container mx-auto py-4">
        <div className="flex justify-end">
          <AuthDialog />
        </div>
      </div>
      <HeroSection />
      <SearchSection onSearchResults={handleSearchResults} />
      <div ref={resultsRef} className="scroll-mt-8">
        <ResultsSection 
          searchPerformed={searchPerformed} 
          flights={flights}
          petPolicies={petPolicies} 
        />
      </div>
    </div>
  );
};

export default Index;
