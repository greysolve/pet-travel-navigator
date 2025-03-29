
import { supabase, clearAuthData } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/use-toast";
import { AuthError } from "@supabase/supabase-js";

export function useAuthOperations() {
  const signIn = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      }
    });

    if (error) {
      console.error('Sign in error:', error);
      toast({
        title: "Error signing in",
        description: error.message,
        variant: "destructive",
      });
      throw error;
    }
  };

  const signInWithEmail = async (email: string, password: string): Promise<{ error?: AuthError }> => {
    try {
      // Clear any existing session before attempting to sign in
      // This helps prevent session conflicts
      await supabase.auth.signOut();
      clearAuthData();
      
      console.log('Starting email sign-in for:', email);
      
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('Sign in error:', error);
        toast({
          title: "Error signing in",
          description: error.message,
          variant: "destructive",
        });
      } else {
        console.log('Email sign-in successful');
      }

      return { error };
    } catch (error: any) {
      console.error('Unexpected sign in error:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
      throw error;
    }
  };

  const resetPasswordForEmail = async (email: string): Promise<{ error?: AuthError }> => {
    try {
      // Force sign out before initiating password reset
      await supabase.auth.signOut();
      
      // Clear all authentication data to prevent any lingering sessions
      clearAuthData();
      
      console.log('Starting password reset for:', email);
      
      // Use the exact format from the screenshot
      // href="{{.SiteURL}}/api/auth/confirm?token_hash={{.TokenHash}}&type=recovery&next=/page"
      // We need to set the redirect URL using the format in the screenshot
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/api/auth/confirm?type=recovery&next=/auth/reset-password`,
      });

      if (error) {
        console.error('Password reset error:', error);
        toast({
          title: "Error resetting password",
          description: error.message,
          variant: "destructive",
        });
      } else {
        console.log('Password reset email sent successfully');
        toast({
          title: "Reset email sent",
          description: "Check your email for a password reset link",
        });
      }

      return { error };
    } catch (error: any) {
      console.error('Unexpected reset password error:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
      throw error;
    }
  };

  const updatePassword = async (newPassword: string): Promise<{ error?: AuthError }> => {
    try {
      console.log('Updating password...');
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        console.error('Update password error:', error);
        toast({
          title: "Error updating password",
          description: error.message,
          variant: "destructive",
        });
      } else {
        console.log('Password updated successfully');
        toast({
          title: "Password updated",
          description: "Your password has been successfully updated.",
        });
      }

      return { error };
    } catch (error: any) {
      console.error('Unexpected update password error:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
      throw error;
    }
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    try {
      // Clear any existing session first
      await supabase.auth.signOut();
      clearAuthData();
      
      console.log('Starting sign-up for:', email);
      
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          data: {
            full_name: fullName,
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
    }
  };

  const signOut = async () => {
    try {
      console.log('Starting sign-out process');
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      // Clear all auth data to ensure complete sign out
      const cleared = clearAuthData();
      console.log('Auth data cleared:', cleared);
    } catch (error: any) {
      console.error('Sign out error:', error);
      toast({
        title: "Error signing out",
        description: error.message,
        variant: "destructive",
      });
      throw error;
    }
  };

  return {
    signIn,
    signInWithEmail,
    signUp,
    signOut,
    resetPasswordForEmail,
    updatePassword,
  };
}
