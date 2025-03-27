
import { Loader2, ArrowUp, Infinity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SavedSearchesDropdown } from "./SavedSearchesDropdown";
import type { SearchFormHeaderProps } from "./types";
import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { SystemPlan } from "@/types/auth";

export const SearchFormHeader = ({
  user,
  isPetCaddie,
  searchCount,
  savedSearches,
  onLoadSearch,
  onDeleteSearch,
  isLoading
}: SearchFormHeaderProps) => {
  const [planDetails, setPlanDetails] = useState<SystemPlan | null>(null);
  const [isLoadingPlan, setIsLoadingPlan] = useState(false);

  useEffect(() => {
    const fetchPlanDetails = async () => {
      if (!user?.plan) return;
      
      setIsLoadingPlan(true);
      try {
        const { data, error } = await supabase
          .from('system_plans')
          .select('*')
          .eq('name', user.plan)
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

    if (user?.plan) {
      fetchPlanDetails();
    }
  }, [user?.plan]);

  if (!user) return null;

  return (
    <div className="flex justify-between items-center mb-4">
      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        {isPetCaddie && (
          <>
            {isLoadingPlan ? (
              <span className="flex items-center">
                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                Loading plan...
              </span>
            ) : planDetails?.is_search_unlimited ? (
              <span className="flex items-center">
                <Infinity className="mr-1 h-4 w-4 text-green-500" />
                Unlimited searches
              </span>
            ) : (
              <span>
                Remaining searches: {searchCount ?? 0}
              </span>
            )}
            <Button 
              variant="outline" 
              size="sm" 
              className="text-orange hover:text-orange border-orange hover:bg-orange/10" 
              asChild
            >
              <Link to="/pricing">
                <ArrowUp className="mr-1 h-4 w-4" />
                Upgrade
              </Link>
            </Button>
          </>
        )}
      </div>
      <SavedSearchesDropdown
        savedSearches={savedSearches}
        onLoadSearch={onLoadSearch}
        onDeleteSearch={onDeleteSearch}
      />
    </div>
  );
};
