import { useState } from "react";
import { SearchSection } from "@/components/SearchSection";
import { HeroSection } from "@/components/HeroSection";
import { ResultsSection } from "@/components/ResultsSection";
import type { FlightData, PetPolicy } from "@/components/flight-results/types";

const Home = () => {
  const [searchResults, setSearchResults] = useState<{
    flights?: FlightData[];
    petPolicies?: Record<string, PetPolicy>;
  }>({});
  const [searchPerformed, setSearchPerformed] = useState(false);

  const handleSearchResults = (
    flights: FlightData[], 
    petPolicies?: Record<string, PetPolicy>
  ) => {
    setSearchResults({ flights, petPolicies });
    setSearchPerformed(true);
  };

  return (
    <div className="space-y-8">
      <HeroSection />
      <SearchSection onSearchResults={handleSearchResults} />
      <ResultsSection 
        searchPerformed={searchPerformed}
        flights={searchResults.flights}
        petPolicies={searchResults.petPolicies}
      />
    </div>
  );
};

export default Home;