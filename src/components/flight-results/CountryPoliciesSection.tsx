
import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { DestinationPolicy } from "./DestinationPolicy";
import type { CountryPolicy } from "./types";

interface CountryPoliciesSectionProps {
  searchPerformed: boolean;
  hasFlights: boolean;
  countryPolicies?: CountryPolicy[];
  isLoading: boolean;
}

export const CountryPoliciesSection = ({
  searchPerformed,
  hasFlights,
  countryPolicies = [],
  isLoading
}: CountryPoliciesSectionProps) => {
  return (
    <div id="country-policies" className="space-y-6">
      <h2 className="text-2xl font-semibold mb-6">Country Pet Policies</h2>
      {searchPerformed ? (
        hasFlights ? (
          countryPolicies.length > 0 ? (
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
              {isLoading ? (
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
          // If search was performed but this is airline-only (no flights), show nothing or a gentle note
          <div className="bg-white/80 backdrop-blur-lg rounded-lg shadow-lg p-6">
            <p className="text-gray-500">No country policies shown for airline-only policy search.</p>
          </div>
        )
      ) : (
        <div className="bg-white/80 backdrop-blur-lg rounded-lg shadow-lg p-6">
          <p className="text-gray-500">Please perform a search to view country policies.</p>
        </div>
      )}
    </div>
  );
};

