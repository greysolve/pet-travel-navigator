
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/contexts/profile/ProfileContext";

export const useSearchCount = (userId: string | undefined) => {
  const { profile } = useProfile();

  return useQuery({
    queryKey: ["searchCount", userId],
    queryFn: async () => {
      if (!userId || !profile?.plan) {
        console.log("SearchCount: No user ID or plan, returning 0", { userId, plan: profile?.plan });
        return 0;
      }

      console.log("SearchCount: Fetching search count for user:", userId);
      const { data, error } = await supabase
        .from("profiles")
        .select("search_count")
        .eq("id", userId)
        .single();

      if (error) {
        console.error("Error fetching search count:", error);
        return 0;
      }

      console.log("SearchCount: Received count:", data?.search_count);
      return data?.search_count || 0;
    },
    enabled: !!userId && !!profile?.plan,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    retry: false,
  });
};
