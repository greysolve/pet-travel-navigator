import { Loader2, ArrowUp, Infinity, Users, Plus, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SavedSearchesDropdown } from "./SavedSearchesDropdown";
import type { SavedSearch } from "./types";
import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { SystemPlan } from "@/types/auth";

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
      if (!user) return;
      
      // Get user plan from profile, not directly from user
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('plan')
        .eq('id', user.id)
        .single();
        
      if (profileError || !profile || !profile.plan) {
        console.error("Error fetching user profile:", profileError);
        return;
      }
      
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

    if (user) {
      fetchPlanDetails();
    }
  }, [user]);

  if (!user) return null;

  return (
    <div className="flex justify-between items-center mb-4">
      <div className="flex items-center gap-3 text-sm">
        {isPetCaddie && (
          <>
            {isLoadingPlan ? (
              <span className="flex items-center">
                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                <span className="text-muted-foreground">Loading plan...</span>
              </span>
            ) : planDetails?.is_search_unlimited ? (
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
            >
              <Link to="/pricing">
                <ArrowUp className="mr-1 h-4 w-4" />
                Upgrade
              </Link>
            </Button>
          </>
        )}
        
        <div className="flex items-center gap-2 ml-4">
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
      <SavedSearchesDropdown
        savedSearches={savedSearches}
        onLoadSearch={onLoadSearch}
        onDeleteSearch={onDeleteSearch}
      />
    </div>
  );
};
