
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2 } from "lucide-react";
import { useDynamicTypes } from "@/hooks/useDynamicTypes";
import type { SubscriptionPlan, UserRole } from "@/types/auth";

const formSchema = z.object({
  userEmail: z.string().email("Please enter a valid email address"),
  planType: z.string().min(1, "Please select a plan"),
});

type FormValues = z.infer<typeof formSchema>;

// Define interface for user data to ensure proper typing
interface UserData {
  id: string;
  email: string;
  user_metadata?: Record<string, any>;
  profile?: {
    id: string;
    full_name?: string;
    plan?: SubscriptionPlan;
    search_count?: number;
  };
  role?: UserRole;
}

// Define interface for auth users returned from Supabase
interface AuthUser {
  id: string;
  email?: string | null;
  user_metadata: Record<string, any>;
}

export function ManualSubscriptionUpdate() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [user, setUser] = useState<UserData | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const { getPlanNames, isLoading: typesLoading } = useDynamicTypes();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      userEmail: "",
      planType: "",
    },
  });

  const searchUser = async (email: string) => {
    setIsSearching(true);
    try {
      // Query the auth users directly without using filter parameter
      const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
      
      if (authError) throw authError;
      
      // Find the user with the matching email - add type assertion to fix the error
      const matchingUser = authUsers.users.find(user => user.email === email) as AuthUser | undefined;
      
      if (!matchingUser) {
        toast({
          title: "User not found",
          description: "No user found with this email address",
          variant: "destructive",
        });
        setUser(null);
        return null;
      }
      
      // Get profile data for the user
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', matchingUser.id)
        .single();
        
      if (profileError) {
        throw profileError;
      }
      
      // Get user's current role
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', matchingUser.id)
        .single();
        
      if (roleError && roleError.code !== 'PGRST116') { // PGRST116 is "not found" error
        throw roleError;
      }
      
      const user: UserData = {
        id: matchingUser.id,
        email: matchingUser.email || '',
        user_metadata: matchingUser.user_metadata,
        profile: profileData,
        role: roleData?.role
      };
      
      setUser(user);
      toast({
        title: "User found",
        description: `User found: ${user.email}`,
      });
      
      return user;
    } catch (error) {
      console.error('Error searching for user:', error);
      toast({
        title: "Error",
        description: "An error occurred while searching for the user",
        variant: "destructive",
      });
      setUser(null);
      return null;
    } finally {
      setIsSearching(false);
    }
  };
  
  const updatePlanMutation = useMutation({
    mutationFn: async ({ userId, plan }: { userId: string; plan: string }) => {
      // Determine the appropriate role based on the plan
      const role = plan === 'free' ? 'pet_caddie' : 'pet_lover';
      
      // Update profile with the new plan
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ plan: plan as SubscriptionPlan })
        .eq('id', userId);
        
      if (profileError) throw profileError;
      
      // Update user role
      const { data: existingRole, error: roleCheckError } = await supabase
        .from('user_roles')
        .select('id')
        .eq('user_id', userId)
        .single();
        
      if (roleCheckError && roleCheckError.code !== 'PGRST116') {
        throw roleCheckError;
      }
      
      if (existingRole) {
        // Update existing role
        const { error: updateRoleError } = await supabase
          .from('user_roles')
          .update({ role })
          .eq('user_id', userId);
          
        if (updateRoleError) throw updateRoleError;
      } else {
        // Insert new role
        const { error: insertRoleError } = await supabase
          .from('user_roles')
          .insert({ user_id: userId, role });
          
        if (insertRoleError) throw insertRoleError;
      }
      
      return { userId, plan, role };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast({
        title: "Success",
        description: `User plan updated to ${data.plan} with role ${data.role}`,
      });
      
      // Update the local user state
      setUser((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          profile: {
            ...prev.profile,
            plan: data.plan as SubscriptionPlan
          },
          role: data.role as UserRole
        };
      });
    },
    onError: (error) => {
      console.error("Error updating plan:", error);
      toast({
        title: "Error",
        description: "Failed to update user plan",
        variant: "destructive",
      });
    },
  });

  const handleUserSearch = async () => {
    const email = form.getValues().userEmail;
    if (!email) return;
    
    await searchUser(email);
  };

  const onSubmit = async (values: FormValues) => {
    if (!user) {
      toast({
        title: "Error",
        description: "Please search for a user first",
        variant: "destructive",
      });
      return;
    }
    
    updatePlanMutation.mutate({
      userId: user.id,
      plan: values.planType,
    });
  };

  const planOptions = getPlanNames();

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Manual Subscription Update</CardTitle>
        <CardDescription>
          Update a user's subscription plan manually
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <FormLabel htmlFor="userEmail">User Email</FormLabel>
              <Input 
                id="userEmail"
                placeholder="Enter user email" 
                value={form.getValues().userEmail}
                onChange={(e) => form.setValue('userEmail', e.target.value)}
              />
            </div>
            <Button 
              onClick={handleUserSearch} 
              disabled={isSearching || !form.getValues().userEmail}
            >
              {isSearching ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Searching...
                </>
              ) : (
                'Search'
              )}
            </Button>
          </div>
        </div>

        {user && (
          <div className="space-y-4 border p-4 rounded-md">
            <h3 className="font-medium text-lg">User Details</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="font-medium">Email:</div>
              <div>{user.email}</div>
              
              <div className="font-medium">Name:</div>
              <div>{user.profile?.full_name || 'Not provided'}</div>
              
              <div className="font-medium">Current Plan:</div>
              <div>{user.profile?.plan || 'free'}</div>
              
              <div className="font-medium">Current Role:</div>
              <div>{user.role || 'pet_caddie'}</div>
              
              <div className="font-medium">Search Count:</div>
              <div>{user.profile?.search_count || 0}</div>
            </div>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="planType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>New Plan</FormLabel>
                      <Select
                        disabled={typesLoading || updatePlanMutation.isPending}
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a plan" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {planOptions.map((plan) => (
                            <SelectItem key={plan} value={plan}>
                              {plan}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        This will update the user's subscription plan and role. Free plan = pet_caddie, Paid plans = pet_lover.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <Button 
                  type="submit" 
                  disabled={typesLoading || updatePlanMutation.isPending}
                  className="w-full"
                >
                  {updatePlanMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    'Update Plan'
                  )}
                </Button>
              </form>
            </Form>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default ManualSubscriptionUpdate;
