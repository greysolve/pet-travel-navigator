
import { cn } from "@/lib/utils";
import { SearchFormHeader } from "./SearchFormHeader";
import { PolicySearchForm } from "./forms/PolicySearchForm";
import { RouteSearchForm } from "./forms/RouteSearchForm";
import { SearchButton } from "./SearchButton";
import { SearchDivider } from "./SearchDivider";
import { ApiProvider } from "@/config/feature-flags";
import { Skeleton } from "@/components/ui/skeleton";
import { PetPolicyFilterParams } from "@/types/policy-filters";
import type { SavedSearch, FormContainerProps } from "./types";
import type { FlightData, PetPolicy } from "../flight-results/types";
import type { ToastFunction } from "@/hooks/use-toast";

export const SearchFormContainer = ({
  user,
  isPetCaddie,
  searchCount,
  savedSearches,
  isLoading,
  policySearch,
  setPolicySearch,
  hasRouteSearch,
  clearRouteSearch,
  origin,
  destination,
  setOrigin,
  setDestination,
  date,
  setDate,
  clearPolicySearch,
  shouldSaveSearch,
  setShouldSaveSearch,
  passengers,
  setPassengers,
  toast,
  onSearchResults,
  setFlights,
  onLoadSearch,
  handleDeleteSearch,
  handleSearch,
  onPolicySearch,
  apiProvider,
  enableFallback,
  activeFilters = {},
  onApplyFilters
}: FormContainerProps) => {
  
  const isFormLoading = isLoading;

  return (
    <div className="relative max-w-4xl mx-auto px-4 -mt-10 z-10">
      <div className={cn(
        "bg-gradient-to-br from-white to-[#f8f5f0] shadow-[0_20px_50px_rgba(26,54,93,0.2)] rounded-3xl p-10 border-4 border-[#d4af37]",
        isFormLoading && "opacity-75"
      )}>
        {isFormLoading && !user ? (
          <>
            <div className="flex justify-between items-center mb-4">
              <Skeleton className="h-8 w-32" />
              <Skeleton className="h-8 w-64" />
              <Skeleton className="h-8 w-32" />
            </div>
            <Skeleton className="h-12 w-full mb-4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </>
        ) : (
          <>
            {/* Search Header */}
            <div className="text-center mb-8">
              <h2 className="text-3xl font-serif font-semibold text-[#1a365d] mb-3">
                Find Your Perfect Flight Together
              </h2>
              <p className="text-xl text-[#8b0000] italic font-serif">
                We only show airlines that welcome your baby in the cabin with you
              </p>
            </div>

            <SearchFormHeader
              user={user}
              isPetCaddie={isPetCaddie}
              searchCount={searchCount as number}
              savedSearches={savedSearches}
              passengers={passengers}
              setPassengers={setPassengers}
              onLoadSearch={onLoadSearch}
              onDeleteSearch={(e, id) => {
                e.stopPropagation();
                handleDeleteSearch(id);
              }}
              isLoading={isFormLoading}
              activeFilters={activeFilters}
              onApplyFilters={onApplyFilters}
            />

            <PolicySearchForm 
              policySearch={policySearch}
              setPolicySearch={setPolicySearch}
              isLoading={isFormLoading}
              hasRouteSearch={hasRouteSearch}
              clearRouteSearch={clearRouteSearch}
              user={user}
              toast={toast}
              onSearchResults={onSearchResults}
              setFlights={setFlights}
              onPolicySearch={onPolicySearch}
            />
            
            <SearchDivider />

            <RouteSearchForm
              origin={origin}
              destination={destination}
              setOrigin={setOrigin}
              setDestination={setDestination}
              date={date}
              setDate={setDate}
              isLoading={isFormLoading}
              policySearch={policySearch}
              clearPolicySearch={clearPolicySearch}
              shouldSaveSearch={shouldSaveSearch}
              setShouldSaveSearch={setShouldSaveSearch}
              user={user}
              toast={toast}
              onSearchResults={onSearchResults}
              setFlights={setFlights}
            />
          </>
        )}

        <SearchButton
          isLoading={isFormLoading}
          onClick={handleSearch}
        />
      </div>
    </div>
  );
}
