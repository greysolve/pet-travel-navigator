
import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { UserProfile } from "@/types/auth";

export const useSearchCount = (profile: UserProfile | null) => {
  const { toast } = useToast();
  const [searchCount, setSearchCount] = useState<number | undefined>(profile?.search_count);

  useEffect(() => {
    setSearchCount(profile?.search_count);
  }, [profile?.search_count]);

  const decrementSearchCount = useCallback(async () => {
    if (!profile?.id) {
      toast({
        title: "Error",
        description: "Could not decrement search count: user not found",
        variant: "destructive",
      });
      return false;
    }

    if (profile.search_count === undefined || profile.search_count <= 0) {
      toast({
        title: "No searches remaining",
        description: "You have reached your search limit. Please upgrade your plan.",
        variant: "destructive",
      });
      return false;
    }

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ search_count: profile.search_count - 1 })
        .eq('id', profile.id);

      if (error) {
        console.error("Error decrementing search count:", error);
        toast({
          title: "Error",
          description: "Failed to update search count. Please try again.",
          variant: "destructive",
        });
        return false;
      } else {
        setSearchCount(profile.search_count - 1);
        return true;
      }
    } catch (error) {
      console.error("Unexpected error decrementing search count:", error);
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
      return false;
    }
  }, [profile, toast]);

  return { searchCount, decrementSearchCount };
};
