
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/use-toast";
import { useUser } from "@/contexts/user/UserContext";

export const useAuth = () => {
  const { dispatch } = useUser();
  const [isLoading, setIsLoading] = useState(false);

  const signInWithEmail = async (email: string, password: string): Promise<void> => {
    setIsLoading(true);
    try {
      console.log('Starting email sign-in for:', email);
      
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('Sign in error:', error);
        throw error;
      }

      console.log('Email sign-in successful');
      toast({
        title: "Success",
        description: "Successfully signed in",
      });
      return;
    } catch (error: any) {
      console.error('Unexpected sign in error:', error);
      toast({
        title: "Error signing in",
        description: error.message === "Invalid login credentials" 
          ? "Invalid email or password. Please try again."
          : error.message,
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const signUp = async (email: string, password: string, firstName: string, lastName: string): Promise<void> => {
    setIsLoading(true);
    try {
      console.log('Starting sign-up for:', email);
      
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          data: {
            full_name: `${firstName.trim()} ${lastName.trim()}`,
          },
        },
      });

      if (error) throw error;

      console.log('Sign-up successful');
      toast({
        title: "Success",
        description: "Please check your email to verify your account.",
      });
    } catch (error: any) {
      console.error('Sign up error:', error);
      toast({
        title: "Error signing up",
        description: error.message,
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const resetPasswordForEmail = async (email: string): Promise<void> => {
    setIsLoading(true);
    try {
      console.log('Starting password reset for:', email);
      
      const { error } = await supabase.auth.resetPasswordForEmail(email);

      if (error) {
        console.error('Password reset error:', error);
        throw error;
      }
      
      console.log('Password reset email sent successfully');
      toast({
        title: "Reset email sent",
        description: "Check your email for a password reset link",
      });
    } catch (error: any) {
      console.error('Unexpected reset password error:', error);
      toast({
        title: "Error resetting password",
        description: error.message,
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async (): Promise<void> => {
    setIsLoading(true);
    try {
      console.log('Starting sign-out process');
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      dispatch({ type: 'AUTH_SIGN_OUT' });
      window.location.reload();
    } catch (error: any) {
      toast({
        title: "Error signing out",
        description: error.message,
        variant: "destructive",
      });
      setIsLoading(false);
    }
  };

  return {
    isLoading,
    signInWithEmail,
    signUp,
    resetPasswordForEmail,
    signOut
  };
};
