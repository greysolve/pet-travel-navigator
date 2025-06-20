
import { Loader2, ArrowUp, Infinity, Users, Plus, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SavedSearchesDropdown } from "./SavedSearchesDropdown";
import { Skeleton } from "@/components/ui/skeleton";
import type { SavedSearch, SearchFormHeaderProps } from "./types";
import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { SystemPlan } from "@/types/auth";
import { useUser } from "@/contexts/user/UserContext";
import { AdvancedSearchPopover } from "./AdvancedSearchPopover";

export const SearchFormHeader = ({
  user,
  isPetCaddie,
  searchCount,
  savedSearches,
  passengers,
  setPassengers,
  onLoadSearch,
  onDeleteSearch,
  isLoading,
  activeFilters = {},
  onApplyFilters
}: SearchFormHeaderProps) => {
  const [planDetails, setPlanDetails] = useState<SystemPlan | null>(null);
  const [isLoadingPlan, setIsLoadingPlan] = useState(false);
  const { profile } = useUser();

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
      if (!user || !profile?.plan) return;
      
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

    if (user && profile?.plan) {
      fetchPlanDetails();
    }
  }, [user, profile?.plan]);

  if (!user) return null;

  const hasUnlimitedSearches = searchCount === -1;
  const isAdmin = profile?.userRole === 'site_manager';

  return (
    <div className="space-y-5">
      {/* First Row: Passengers and Saved Searches */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-end">
        {/* Passenger Selection */}
        <div className="flex flex-col">
          <label className="text-lg font-semibold text-[#1a365d] mb-2 font-serif flex items-center gap-2">
            👥 Passengers
          </label>
          <div className="flex items-center gap-3">
            <Button 
              variant="ghost" 
              size="icon" 
              className="w-8 h-8 rounded-full bg-[#d4af37] hover:bg-[#f4d03f] text-[#1a365d] font-bold border-none" 
              onClick={decrementPassengers}
              disabled={passengers <= 1 || isLoading}
            >
              <Minus className="h-4 w-4" />
            </Button>
            <input 
              type="text" 
              value={passengers} 
              readOnly
              className="w-16 text-center text-xl font-semibold bg-white border-2 border-[#e2e8f0] rounded-lg py-3 px-4 focus:border-[#d4af37] focus:outline-none focus:ring-3 focus:ring-[rgba(212,175,55,0.2)]"
            />
            <Button 
              variant="ghost" 
              size="icon" 
              className="w-8 h-8 rounded-full bg-[#d4af37] hover:bg-[#f4d03f] text-[#1a365d] font-bold border-none" 
              onClick={incrementPassengers}
              disabled={passengers >= 9 || isLoading}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* My Saved Searches */}
        <div className="flex flex-col">
          <div className="h-8"></div> {/* Spacer to align with passenger label */}
          <SavedSearchesDropdown
            savedSearches={savedSearches}
            onLoadSearch={onLoadSearch}
            onDeleteSearch={onDeleteSearch}
            customTrigger={
              <Button className="w-full bg-white border-2 border-[#d4af37] text-[#1a365d] font-bold py-4 rounded-lg hover:bg-[#f7f1e8] transition-all duration-300">
                My Saved Searches
              </Button>
            }
          />
        </div>
      </div>

      {/* Premium Filters */}
      <div className="bg-gradient-to-br from-[#f7f1e8] to-[#ede0d3] border-2 border-[#d4af37] rounded-xl p-6">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <h3 className="text-2xl font-serif font-semibold text-[#1a365d]">
              👑 Premium Filters
            </h3>
            <span className="bg-[#8b0000] text-white px-3 py-1 rounded-full text-sm font-bold">
              {user?.user_metadata?.full_name?.toUpperCase() || user?.email?.split('@')[0]?.toUpperCase() || 'YOUR'}'S APPROVED
            </span>
          </div>
          
          {/* Search Count / Plan Info - Only show for non-admin users */}
          {isPetCaddie && !isAdmin && (
            <div className="flex items-center gap-3">
              {isLoading ? (
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
                className="text-orange hover:text-orange border-orange hover:bg-orange/10" 
                asChild
                disabled={isLoading}
              >
                <Link to="/pricing">
                  <ArrowUp className="mr-1 h-4 w-4" />
                  Upgrade
                </Link>
              </Button>
            </div>
          )}
        </div>
        
        <AdvancedSearchPopover
          onApplyFilters={onApplyFilters}
          activeFilters={activeFilters}
          isLoading={isLoading}
          showAsExpanded={true}
        />
      </div>
    </div>
  );
};
