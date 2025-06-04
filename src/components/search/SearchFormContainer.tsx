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
  
  // Simple loading condition
  const isFormLoading = isLoading;

  // Make handleSearchClick properly async to match the expected Promise<void> type
  const handleSearchClick = async (): Promise<void> => {
    return await handleSearch();
  };

  return (
    <div className="relative max-w-3xl mx-auto px-4 -mt-28 z-10">
      <div className={cn(
        "bg-white shadow-xl rounded-xl p-6 space-y-6",
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
          onClick={handleSearchClick}
        />
      </div>
    </div>
  );
}
