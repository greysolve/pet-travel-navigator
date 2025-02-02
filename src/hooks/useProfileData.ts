import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { toast } from "@/components/ui/use-toast";
import { UserProfile } from "@/types/auth";

export function useProfileData(userId: string) {
  const queryClient = useQueryClient();

  const { data: profile, isLoading } = useQuery({
    queryKey: ["profile", userId],
    queryFn: async () => {
      console.log("Fetching profile for user:", userId);
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (error) {
        console.error("Error fetching profile:", error);
        throw error;
      }

      console.log("Profile data fetched:", data);
      return data as UserProfile;
    },
    enabled: !!userId,
  });

  const updateProfile = useMutation({
    mutationFn: async (updatedProfile: Partial<UserProfile>) => {
      console.log("Updating profile:", updatedProfile);
      const { error } = await supabase
        .from("profiles")
        .update(updatedProfile)
        .eq("id", userId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile", userId] });
      toast({
        title: "Profile updated",
        description: "Your profile has been updated successfully.",
      });
    },
    onError: (error) => {
      console.error("Error updating profile:", error);
      toast({
        title: "Error",
        description: "Failed to update profile.",
        variant: "destructive",
      });
    },
  });

  return {
    profile,
    isLoading,
    updateProfile,
  };
}