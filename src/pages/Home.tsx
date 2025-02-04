import { useState } from "react";
import { SearchSection } from "@/components/SearchSection";
import { HeroSection } from "@/components/HeroSection";
import { ResultsSection } from "@/components/ResultsSection";
import { FlightJourney, PetPolicy } from "@/types/policies";

const Home = () => {
  const [searchResults, setSearchResults] = useState<{
    flights?: FlightJourney[];
    petPolicies?: Record<string, PetPolicy>;
  }>({});
  const [searchPerformed, setSearchPerformed] = useState(false);

  const handleSearchResults = (results: {
    flights?: FlightJourney[];
    petPolicies?: Record<string, PetPolicy>;
  }) => {
    setSearchResults(results);
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