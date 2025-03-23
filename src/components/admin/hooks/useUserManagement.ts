import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { UserRole, SubscriptionPlan } from "@/types/auth";

interface User {
  id: string;
  email: string;
  role?: UserRole;
  first_name?: string;
  last_name?: string;
  plan?: SubscriptionPlan;
}

export const useUserManagement = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: users, isLoading, error } = useQuery({
    queryKey: ["users"],
    queryFn: async () => {
      console.log("Starting user fetch request...");
      const { data, error: functionError } = await supabase.functions.invoke('manage_users', {
        method: 'GET'
      });

      if (functionError) {
        console.error("Error in function:", functionError);
        throw functionError;
      }

      console.log("Users data received:", data);
      return data;
    },
  });

  const updateUser = useMutation({
    mutationFn: async (userData: { 
      id: string; 
      first_name?: string;
      last_name?: string;
      role?: UserRole; 
      plan?: SubscriptionPlan 
    }) => {
      console.log("Updating user:", userData);
      const { error } = await supabase.functions.invoke('manage_users', {
        method: 'PATCH',
        body: userData
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast({
        title: "Success",
        description: "User updated successfully",
      });
    },
    onError: (error) => {
      console.error("Error updating user:", error);
      toast({
        title: "Error",
        description: "Failed to update user",
        variant: "destructive",
      });
    },
  });

  const deleteUser = useMutation({
    mutationFn: async (userId: string) => {
      console.log("Deleting user:", userId);
      
      const { error: deleteAuthError } = await supabase.functions.invoke('manage_users', {
        method: 'DELETE',
        body: { userId }
      });

      if (deleteAuthError) {
        console.error("Error deleting auth user:", deleteAuthError);
        throw deleteAuthError;
      }

      toast({
        title: "Success",
        description: "User deleted successfully",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (error) => {
      console.error("Error deleting user:", error);
      toast({
        title: "Error",
        description: "Failed to delete user",
        variant: "destructive",
      });
    },
  });

  return {
    users,
    isLoading,
    error,
    updateUser,
    deleteUser,
  };
};
