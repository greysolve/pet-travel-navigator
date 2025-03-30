
import { useState } from "react";
import { usePetPolicies, useCountryPolicies } from "./flight-results/PolicyFetcher";
import { FlightResults } from "./flight-results/FlightResults";
import { useProfile } from "@/contexts/profile/ProfileContext";
import { usePremiumFields } from "@/hooks/usePremiumFields";
import { decorateWithPremiumFields } from "@/utils/policyDecorator";
import { ApiWarning } from "./flight-results/ApiWarning";
import { ExportButton } from "./flight-results/ExportButton";
import { NoResults } from "./flight-results/NoResults";
import { SinglePolicyResult } from "./flight-results/SinglePolicyResult";
import { CountryPoliciesSection } from "./flight-results/CountryPoliciesSection";
import { ExportDialogWrapper } from "./flight-results/ExportDialogWrapper";
import type { FlightData, PetPolicy } from "./flight-results/types";

export const ResultsSection = ({ 
  searchPerformed,
  flights = [],
  petPolicies,
  isMobile,
  apiProvider,
  apiError,
}: { 
  searchPerformed: boolean;
  flights?: FlightData[];
  petPolicies?: Record<string, PetPolicy>;
  isMobile?: boolean;
  apiProvider?: string;
  apiError?: string;
}) => {
  const [showExportDialog, setShowExportDialog] = useState(false);
  const { profile } = useProfile();
  const isPetCaddie = profile?.userRole === 'pet_caddie';
  const { data: premiumFields = [] } = usePremiumFields();
  const { data: flightPetPolicies, isLoading: isPoliciesLoading } = usePetPolicies(flights);
  
  const { data: countryPolicies, isLoading: isCountryPoliciesLoading } = useCountryPolicies(flights);

  const hasExportableResults = flights.length > 0 || (petPolicies && Object.keys(petPolicies).length > 0);
  const canExport = !isPetCaddie && hasExportableResults;

  if (!searchPerformed) return null;

  // Case: Single airline policy search with no flights
  if (flights.length === 0 && petPolicies && Object.keys(petPolicies).length > 0) {
    const airlineName = Object.keys(petPolicies)[0];
    const rawPolicy = petPolicies[airlineName];
    
    if (!rawPolicy) {
      return <NoResults message="No policy information available." />;
    }
    
    const policy = isPetCaddie 
      ? decorateWithPremiumFields(rawPolicy, premiumFields)
      : rawPolicy;
    
    return (
      <SinglePolicyResult 
        airlineName={airlineName} 
        policy={policy} 
        canExport={canExport}
        isMobile={isMobile}
      />
    );
  }

  return (
    <div id="search-results" className="container mx-auto px-4 py-12 animate-fade-in">
      <div className="space-y-8 text-left">
        <ApiWarning message={apiError || ""} />
        
        {flights.length > 0 && (
          <>
            {canExport && (
              <ExportButton onClick={() => setShowExportDialog(true)} />
            )}
            <FlightResults 
              flights={flights} 
              petPolicies={isPoliciesLoading ? undefined : flightPetPolicies}
              apiProvider={apiProvider}
            />
          </>
        )}
        
        <CountryPoliciesSection 
          searchPerformed={searchPerformed}
          hasFlights={flights.length > 0}
          countryPolicies={countryPolicies}
          isLoading={isCountryPoliciesLoading}
        />
      </div>

      <ExportDialogWrapper
        isOpen={showExportDialog}
        setIsOpen={setShowExportDialog}
        flights={flights}
        petPolicies={petPolicies || flightPetPolicies}
        countryPolicies={countryPolicies || []}
        isMobile={isMobile}
      />
    </div>
  );
};
