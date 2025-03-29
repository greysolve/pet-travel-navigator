
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const useSearchCount = (userId: string | undefined) => {
  return useQuery({
    queryKey: ["searchCount", userId],
    queryFn: async () => {
      if (!userId) {
        console.log("SearchCount: No user ID, returning 0");
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
    enabled: !!userId,
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchOnMount: true,
    refetchOnWindowFocus: false,
  });
};
