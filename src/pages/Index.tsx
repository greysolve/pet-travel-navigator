
import { useState, useRef, useEffect } from "react";
import { HeroSection } from "@/components/HeroSection";
import { SearchSection } from "@/components/SearchSection";
import { ResultsSection } from "@/components/ResultsSection";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import type { FlightData, PetPolicy } from "@/components/flight-results/types";

const Index = () => {
  const [searchPerformed, setSearchPerformed] = useState(false);
  const [flights, setFlights] = useState<FlightData[]>([]);
  const [petPolicies, setPetPolicies] = useState<Record<string, PetPolicy>>();
  const resultsRef = useRef<HTMLDivElement>(null);
  const { user, profileError } = useAuth();
  const navigate = useNavigate();

  // Reset all search states when auth changes
  useEffect(() => {
    console.log('Auth state changed, resetting search state');
    setSearchPerformed(false);
    setFlights([]);
    setPetPolicies(undefined);
  }, [user?.id]);

  // Redirect to auth page if there's a profile error
  useEffect(() => {
    if (profileError) {
      navigate('/auth');
    }
  }, [profileError, navigate]);

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
