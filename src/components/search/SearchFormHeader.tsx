
import { Loader2, ArrowUp, Infinity, Users, Plus, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SavedSearchesDropdown } from "./SavedSearchesDropdown";
import { Skeleton } from "@/components/ui/skeleton";
import type { SavedSearch } from "./types";
import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { SystemPlan } from "@/types/auth";
import { useUser } from "@/contexts/user/UserContext";

export interface SearchFormHeaderProps {
  user: any;
  isPetCaddie: boolean;
  searchCount: number | undefined;
  savedSearches: SavedSearch[];
  passengers: number;
  setPassengers: (value: number) => void;
  onLoadSearch: (searchCriteria: SavedSearch['search_criteria']) => void;
  onDeleteSearch: (e: React.MouseEvent, id: string) => void;
  isLoading: boolean;
}

export const SearchFormHeader = ({
  user,
  isPetCaddie,
  searchCount,
  savedSearches,
  passengers,
  setPassengers,
  onLoadSearch,
  onDeleteSearch,
  isLoading
}: SearchFormHeaderProps) => {
  const [planDetails, setPlanDetails] = useState<SystemPlan | null>(null);
  const [isLoadingPlan, setIsLoadingPlan] = useState(false);
  const { profile, profileInitialized } = useUser();

  const incrementPassengers = () => {
    if (passengers < 9) {
      setPassengers(passengers + 1);
    }
  };

  const decrementPassengers = () => {
    if (passengers > 1) {
      setPassengers(passengers - 1);
    }
  };

  useEffect(() => {
    const fetchPlanDetails = async () => {
      if (!user || !profileInitialized) return;
      
      // Get user plan from profile, not directly from user
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('plan, userRole:user_roles(role)')
        .eq('id', user.id)
        .single();
        
      if (profileError || !profile) {
        console.error("Error fetching user profile:", profileError);
        return;
      }
      
      if (!profile.plan) return;
      
      setIsLoadingPlan(true);
      try {
        const { data, error } = await supabase
          .from('system_plans')
          .select('*')
          .eq('name', profile.plan)
          .single();

        if (error) {
          console.error("Error fetching plan details:", error);
        } else {
          setPlanDetails(data as SystemPlan);
        }
      } catch (error) {
        console.error("Unexpected error fetching plan details:", error);
      } finally {
        setIsLoadingPlan(false);
      }
    };

    if (user && profileInitialized) {
      fetchPlanDetails();
    }
  }, [user, profileInitialized]);

  if (!user) return null;

  // Check if the profile is still loading
  const isProfileLoading = !profileInitialized;
  
  // Check if search count is -1, which means unlimited searches
  const hasUnlimitedSearches = searchCount === -1;
  
  // Check if the user is an admin (site_manager)
  const isAdmin = profile?.userRole === 'site_manager';

  return (
    <div className="flex justify-between items-center mb-4">
      <div className="flex flex-1 items-center gap-3 text-sm">
        {/* Passenger Selection */}
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground flex items-center">
            <Users className="h-4 w-4 mr-1" />
            Passengers:
          </span>
          <div className="flex items-center border rounded-md">
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 rounded-r-none" 
              onClick={decrementPassengers}
              disabled={passengers <= 1 || isLoading}
            >
              <Minus className="h-4 w-4" />
            </Button>
            <span className="w-8 text-center">{passengers}</span>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 rounded-l-none" 
              onClick={incrementPassengers}
              disabled={passengers >= 9 || isLoading}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
      
      {/* Search Count / Plan Info - Only show for non-admin users */}
      {isPetCaddie && !isAdmin && (
        <div className="flex-1 flex items-center justify-center">
          {isProfileLoading ? (
            <Skeleton className="h-6 w-32" />
          ) : isLoadingPlan ? (
            <span className="flex items-center">
              <Loader2 className="mr-1 h-3 w-3 animate-spin" />
              <span className="text-muted-foreground">Loading plan...</span>
            </span>
          ) : hasUnlimitedSearches || planDetails?.is_search_unlimited ? (
            <span className="flex items-center">
              <Infinity className="mr-1 h-4 w-4 text-green-500" />
              <span className="text-muted-foreground">Unlimited searches</span>
            </span>
          ) : (
            <span className="text-muted-foreground">
              Remaining searches: {searchCount ?? 0}
            </span>
          )}
          <Button 
            variant="outline" 
            size="sm" 
            className="text-orange hover:text-orange border-orange hover:bg-orange/10 ml-2" 
            asChild
            disabled={isProfileLoading}
          >
            <Link to="/pricing">
              <ArrowUp className="mr-1 h-4 w-4" />
              Upgrade
            </Link>
          </Button>
        </div>
      )}
      
      {/* Saved Searches Dropdown */}
      <div className="flex-1 flex justify-end">
        <SavedSearchesDropdown
          savedSearches={savedSearches}
          onLoadSearch={onLoadSearch}
          onDeleteSearch={onDeleteSearch}
        />
      </div>
    </div>
  );
};
