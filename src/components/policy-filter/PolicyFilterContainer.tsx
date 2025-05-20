
import { useState } from "react";
import { PetPolicyFilters } from "./PetPolicyFilters";
import { usePetPolicyFilters } from "@/hooks/usePetPolicyFilters";
import { PetPolicyFilterParams, FilteredPolicyResult } from "@/types/policy-filters";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Card } from "@/components/ui/card";

interface PolicyFilterContainerProps {
  onFilterResults?: (results: FilteredPolicyResult[]) => void;
}

export const PolicyFilterContainer = ({ onFilterResults }: PolicyFilterContainerProps) => {
  const { 
    filters, 
    isFiltering, 
    filteredPolicies, 
    filterError, 
    applyFilters 
  } = usePetPolicyFilters();

  const handleApplyFilters = async (newFilters: PetPolicyFilterParams) => {
    const results = await applyFilters(newFilters);
    if (onFilterResults) {
      onFilterResults(results);
    }
  };

  return (
    <div className="space-y-4">
      <PetPolicyFilters onApplyFilters={handleApplyFilters} />
      
      {isFiltering && (
        <div className="space-y-2">
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-1/2" />
        </div>
      )}
      
      {filterError && (
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{filterError}</AlertDescription>
        </Alert>
      )}
      
      {!isFiltering && filteredPolicies.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Matching Airlines ({filteredPolicies.length})</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredPolicies.map((result) => (
              <Card key={result.airlineId} className="p-4">
                <h4 className="font-semibold">{result.airlineName} ({result.airlineCode})</h4>
                <div className="text-sm mt-2">
                  {result.matchReason.map((reason, idx) => (
                    <div key={idx} className="text-green-600 flex items-center">
                      <span className="inline-block h-1.5 w-1.5 rounded-full bg-green-600 mr-1.5"></span>
                      {reason}
                    </div>
                  ))}
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
      
      {!isFiltering && filteredPolicies.length === 0 && Object.keys(filters).some(k => !!filters[k]) && (
        <Alert>
          <AlertTitle>No matching airlines found</AlertTitle>
          <AlertDescription>
            Try adjusting your filter criteria to see more results.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};
