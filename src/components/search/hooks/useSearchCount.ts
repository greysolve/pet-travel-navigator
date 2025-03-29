import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/contexts/profile/ProfileContext";

export const useSearchCount = (userId: string | undefined) => {
  const { profile } = useProfile();

  return useQuery(
    ["searchCount", userId],
    async () => {
      if (!userId || !profile?.plan) {
        return 0;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("search_count")
        .eq("id", userId)
        .single();

      if (error) {
        console.error("Error fetching search count:", error);
        return 0;
      }

      return data?.search_count || 0;
    },
    {
      enabled: !!userId && !!profile?.plan,
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      retry: false,
    }
  );
};
