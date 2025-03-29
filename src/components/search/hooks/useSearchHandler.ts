
import { useAuth } from "@/contexts/auth/AuthContext";
import { ApiProvider } from "@/config/feature-flags";
import { useUserSearchCount } from "./useUserSearchCount";
import { useSavedSearches } from "./useSavedSearches";
import { useUser } from "@/contexts/user/UserContext";
import { useToast } from "@/hooks/use-toast";

export const useSearchHandler = ({
  user,
  toast,
  policySearch,
  origin,
  destination,
  date,
  passengers,
  shouldSaveSearch,
  setFlights,
  handleFlightSearch,
  onSearchResults,
  apiProvider,
  enableFallback,
}) => {
  const { savedSearches, handleDeleteSearch, saveFlight } = useSavedSearches(user?.id);
  const { searchCount, isUnlimited } = useUserSearchCount();
  const { profile } = useUser();

  // Handle policy search
  const handlePolicySearch = async () => {
    if (!canSearch()) return;

    try {
      // Save search if needed
      if (shouldSaveSearch) {
        await saveFlight(origin, destination, date, passengers);
      }

      // Handle policy search logic
      setFlights([]);
      onSearchResults([], {}, apiProvider, "No flights found, searching policies instead");
      toast({
        title: "Policy search",
        description: `Searching policies for ${policySearch}`,
      });
    } catch (error) {
      console.error("Policy search error:", error);
      toast({
        title: "Search error",
        description: "Failed to search policies. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Handle route search
  const handleRouteSearch = async () => {
    if (!canSearch()) return;

    try {
      // Save search if needed
      if (shouldSaveSearch) {
        await saveFlight(origin, destination, date, passengers);
      }

      // Execute the flight search
      const flights = await handleFlightSearch(
        origin,
        destination,
        date,
        onSearchResults,
        undefined,
        apiProvider,
        enableFallback,
        passengers
      );

      setFlights(flights);
    } catch (error) {
      console.error("Route search error:", error);
      toast({
        title: "Search error",
        description: "Failed to search flights. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Check if the user can perform a search
  const canSearch = () => {
    // Admin users can always search
    if (profile?.userRole === 'site_manager' || isUnlimited) {
      return true;
    }

    // Check search count for other users
    if ((searchCount !== undefined && searchCount <= 0) || !user) {
      toast({
        title: "Search limit reached",
        description: "You have used all your available searches. Please upgrade to continue searching.",
        variant: "destructive",
      });
      return false;
    }

    return true;
  };

  return {
    handlePolicySearch,
    handleRouteSearch,
  };
};
