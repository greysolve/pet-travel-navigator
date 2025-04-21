import { useUser } from '@/contexts/user/UserContext';
import { ApiProvider } from "@/config/feature-flags";
import { useUserSearchCount } from "./useUserSearchCount";
import { useSavedSearches } from "./useSavedSearches";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

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
  const { searchCount, isUnlimited, isLoading: isSearchCountLoading } = useUserSearchCount();
  const { profile, profileLoading } = useUser();
  
  // Determine if we are still loading profile data
  const isLoading = profileLoading || isSearchCountLoading;

  // Helper: Fetch policy for a single airline
  const fetchSingleAirlinePolicy = async (iata: string) => {
    try {
      if (!iata) return null;
      console.log("[useSearchHandler] Fetching airline policy for:", iata);
      // Query airline by IATA to get airline UUID (since policies table uses UUID)
      let { data: airlines, error: airlineError } = await supabase
        .from("airlines")
        .select("id, name")
        .eq("iata_code", iata)
        .maybeSingle();

      if (airlineError) {
        console.error("[useSearchHandler] Airline fetch error", airlineError);
        toast({
          title: "Airline lookup failed",
          description: "Could not find airline for the given IATA code.",
          variant: "destructive",
        });
        return null;
      }
      if (!airlines) {
        toast({
          title: "No airline found",
          description: `No airline found for code ${iata}`,
          variant: "destructive",
        });
        return null;
      }
      const airlineId = airlines.id;
      const airlineName = airlines.name;

      // Query the pet policy for this airline
      let { data: policy, error: policyError } = await supabase
        .from("pet_policies")
        .select("*")
        .eq("airline_id", airlineId)
        .maybeSingle();

      if (policyError) {
        console.error("[useSearchHandler] Pet policy fetch error", policyError);
        toast({
          title: "Policy lookup failed",
          description: "Could not fetch pet policy for this airline.",
          variant: "destructive",
        });
        return null;
      }
      if (!policy) {
        toast({
          title: "No policy found",
          description: `This airline doesn't have a pet policy in our system.`,
          variant: "destructive",
        });
        return null;
      }
      // Shape for display in petPolicies object
      return { [airlineName]: policy };
    } catch (err: any) {
      console.error("[useSearchHandler] Unexpected error fetching airline policy", err);
      toast({
        title: "Unexpected error",
        description: err.message || "Error occurred searching for airline policy.",
        variant: "destructive",
      });
      return null;
    }
  };

  // Handle policy search
  const handlePolicySearch = async () => {
    if (!canSearch()) return;

    try {
      // Save search if needed
      if (shouldSaveSearch && user) {
        await saveFlight(origin, destination, date, passengers);
      }

      setFlights([]);
      toast({
        title: "Policy Search Started",
        description: `Searching policies for airline: ${policySearch}`,
      });

      // Actually fetch policy from supabase & send to result handler:
      if (policySearch) {
        const policiesResult = await fetchSingleAirlinePolicy(policySearch);
        if (policiesResult) {
          onSearchResults([], policiesResult, apiProvider, "");
        } else {
          onSearchResults([], {}, apiProvider, "No policy found.");
        }
      } else {
        // fallback: should not occur, but handle gracefully
        onSearchResults([], {}, apiProvider, "No airline selected.");
      }
    } catch (error) {
      console.error("Policy search error:", error);
      toast({
        title: "Search error",
        description: "Failed to search policies. Please try again.",
        variant: "destructive",
      });
      onSearchResults([], {}, apiProvider, "Error performing airline policy search.");
    }
  };

  // Handle route search
  const handleRouteSearch = async () => {
    if (!canSearch()) return;

    try {
      // Save search if needed
      if (shouldSaveSearch && user) {
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
    if (isLoading) {
      toast({
        title: "Loading",
        description: "Please wait while we load your profile data",
      });
      return false;
    }
    
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to search",
        variant: "destructive",
      });
      return false;
    }

    // Admin users can always search
    if (profile?.userRole === 'site_manager' || isUnlimited) {
      return true;
    }

    // Check search count for other users
    if (searchCount !== undefined && searchCount <= 0) {
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
    isLoading,
  };
};
