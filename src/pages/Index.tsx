import { useState } from "react";
import { HeroSection } from "@/components/HeroSection";
import { SearchSection } from "@/components/SearchSection";
import { ResultsSection } from "@/components/ResultsSection";

type FlightData = {
  carrierFsCode: string;
  flightNumber: string;
  departureTime: string;
  arrivalTime: string;
};

const Index = () => {
  const [searchPerformed, setSearchPerformed] = useState(false);
  const [flights, setFlights] = useState<FlightData[]>([]);

  const handleSearchResults = (results: FlightData[]) => {
    setFlights(results);
    setSearchPerformed(true);
  };

  return (
    <div className="min-h-screen bg-[#F1F0FB]">
      <HeroSection />
      <SearchSection onSearchResults={handleSearchResults} />
      <ResultsSection searchPerformed={searchPerformed} flights={flights} />
    </div>
  );
};

export default Index;