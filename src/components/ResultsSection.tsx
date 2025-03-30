import { useState } from "react";
import { usePetPolicies, useCountryPolicies } from "./flight-results/PolicyFetcher";
import { FlightResults } from "./flight-results/FlightResults";
import { DestinationPolicy } from "./flight-results/DestinationPolicy";
import { PolicyDetails } from "./flight-results/PolicyDetails";
import { Skeleton } from "@/components/ui/skeleton";
import { useProfile } from "@/contexts/profile/ProfileContext";
import { usePremiumFields } from "@/hooks/usePremiumFields";
import { decorateWithPremiumFields } from "@/utils/policyDecorator";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ExportDialog } from "./search/saved-searches/ExportDialog";
import { Button } from "@/components/ui/button";
import { FileDown, AlertTriangle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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

  if (flights.length === 0 && petPolicies && Object.keys(petPolicies).length > 0) {
    const airlineName = Object.keys(petPolicies)[0];
    const rawPolicy = petPolicies[airlineName];
    
    if (!rawPolicy) {
      return (
        <div id="search-results" className="container mx-auto px-4 py-12 animate-fade-in">
          <div className="bg-white/80 backdrop-blur-lg rounded-lg shadow-lg p-6 text-left">
            <p>No policy information available.</p>
          </div>
        </div>
      );
    }
    
    const policy = isPetCaddie 
      ? decorateWithPremiumFields(rawPolicy, premiumFields)
      : rawPolicy;
    
    return (
      <div id="search-results" className="container mx-auto px-4 py-12 animate-fade-in">
        <div className="bg-white/80 backdrop-blur-lg rounded-lg shadow-lg p-6 text-left">
          {canExport && (
            <div className="flex justify-end mb-4">
              <Button
                variant="outline"
                onClick={() => setShowExportDialog(true)}
                className="gap-2"
              >
                <FileDown className="h-4 w-4" />
                Export Results
              </Button>
            </div>
          )}
          <h2 className="text-xl font-semibold mb-4">
            Pet Policy for {airlineName}
          </h2>
          <PolicyDetails policy={policy} />
        </div>

        <Dialog open={showExportDialog} onOpenChange={setShowExportDialog}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <ExportDialog
              isOpen={showExportDialog}
              flights={[]}
              petPolicies={petPolicies}
              countryPolicies={[]}
              onClose={() => setShowExportDialog(false)}
            />
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div id="search-results" className="container mx-auto px-4 py-12 animate-fade-in">
      <div className="space-y-8 text-left">
        {apiError && (
          <Alert variant="info" className="mb-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>API Warning</AlertTitle>
            <AlertDescription>
              {apiError}
            </AlertDescription>
          </Alert>
        )}
        
        {flights.length > 0 && (
          <>
            {canExport && (
              <div className="flex justify-end">
                <Button
                  variant="outline"
                  onClick={() => setShowExportDialog(true)}
                  className="gap-2"
                >
                  <FileDown className="h-4 w-4" />
                  Export Results
                </Button>
              </div>
            )}
            <FlightResults 
              flights={flights} 
              petPolicies={isPoliciesLoading ? undefined : flightPetPolicies}
              apiProvider={apiProvider}
            />
          </>
        )}
        
        <div id="country-policies" className="space-y-6">
          <h2 className="text-2xl font-semibold mb-6">Country Pet Policies</h2>
          {searchPerformed ? (
            flights.length > 0 ? (
              countryPolicies && countryPolicies.length > 0 ? (
                countryPolicies.map((policy, index) => (
                  <div 
                    key={`${policy.country_code}-${policy.policy_type}-${index}`}
                    className="animate-fade-in"
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <DestinationPolicy policy={policy} />
                  </div>
                ))
              ) : (
                <div className="bg-white/80 backdrop-blur-lg rounded-lg shadow-lg p-6">
                  {isCountryPoliciesLoading ? (
                    <div className="space-y-4">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-4 w-1/2" />
                      <Skeleton className="h-4 w-2/3" />
                    </div>
                  ) : (
                    <p className="text-gray-500">No pet policies found for the selected countries.</p>
                  )}
                </div>
              )
            ) : (
              <div className="bg-white/80 backdrop-blur-lg rounded-lg shadow-lg p-6">
                <p className="text-gray-500">No countries found in search results.</p>
              </div>
            )
          ) : (
            <div className="bg-white/80 backdrop-blur-lg rounded-lg shadow-lg p-6">
              <p className="text-gray-500">Please perform a search to view country policies.</p>
            </div>
          )}
        </div>
      </div>

      <Dialog open={showExportDialog} onOpenChange={setShowExportDialog}>
        <DialogContent className={`${isMobile ? 'w-[95vw] max-w-[95vw]' : 'max-w-4xl'} max-h-[90vh] overflow-y-auto`}>
          <ExportDialog
            isOpen={showExportDialog}
            flights={flights}
            petPolicies={petPolicies || flightPetPolicies}
            countryPolicies={countryPolicies || []}
            onClose={() => setShowExportDialog(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};
