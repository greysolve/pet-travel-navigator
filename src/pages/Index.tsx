
import { useState, useRef, useEffect } from "react";
import { HeroSection } from "@/components/HeroSection";
import { SearchSection } from "@/components/SearchSection";
import { ResultsSection } from "@/components/ResultsSection";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";
import type { FlightData, PetPolicy } from "@/components/flight-results/types";

const Index = () => {
  const [searchPerformed, setSearchPerformed] = useState(false);
  const [flights, setFlights] = useState<FlightData[]>([]);
  const [petPolicies, setPetPolicies] = useState<Record<string, PetPolicy>>();
  const resultsRef = useRef<HTMLDivElement>(null);
  const { user, profileError, profileLoading, retryProfileLoad } = useAuth();

  // Reset all search states when auth changes
  useEffect(() => {
    console.log('Auth state changed, resetting search state');
    setSearchPerformed(false);
    setFlights([]);
    setPetPolicies(undefined);
  }, [user?.id]);

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

  if (profileError) {
    return (
      <div className="min-h-screen bg-[#F1F0FB] flex items-center justify-center">
        <div className="max-w-md p-6 bg-white rounded-lg shadow-lg">
          <div className="flex items-center gap-2 text-red-500 mb-4">
            <AlertCircle className="h-5 w-5" />
            <h2 className="text-lg font-semibold">Profile Error</h2>
          </div>
          <p className="text-gray-600 mb-4">
            {profileError.message}
          </p>
          <Button 
            onClick={retryProfileLoad}
            className="w-full"
          >
            Retry Loading Profile
          </Button>
        </div>
      </div>
    );
  }

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
