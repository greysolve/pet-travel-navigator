
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
import type { SubscriptionPlan } from "@/types/auth";

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
      // Since find_user_by_email is not an allowed RPC, use a direct query instead
      const { data: userData, error: userError } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', (await supabase.auth.admin.listUsers({
          filter: { email }
        })).data?.users[0]?.id || '')
        .single();
      
      if (userError || !userData) {
        toast({
          title: "User not found",
          description: "No user found with this email address",
          variant: "destructive",
        });
        setUser(null);
        return null;
      }
      
      // Get auth data for the user
      const { data: authData } = await supabase.auth.admin.getUserById(userData.id);
      
      if (!authData || !authData.user) {
        throw new Error('User not found');
      }
      
      // Get profile data for the user
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userData.id)
        .single();
        
      if (profileError) {
        throw profileError;
      }
      
      const user: UserData = {
        id: authData.user.id,
        email: authData.user.email || '',
        user_metadata: authData.user.user_metadata,
        profile: profileData
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
      const { error } = await supabase
        .from('profiles')
        .update({ plan: plan as SubscriptionPlan })
        .eq('id', userId);
        
      if (error) throw error;
      
      return { userId, plan };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast({
        title: "Success",
        description: `User plan updated to ${data.plan}`,
      });
      
      // Update the local user state
      setUser((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          profile: {
            ...prev.profile,
            plan: data.plan as SubscriptionPlan
          }
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
                        This will update the user's subscription plan.
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
