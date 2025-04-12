
import { useState, useEffect } from "react";
import { useUser } from "@/contexts/user/UserContext";
import { useProfile } from "@/contexts/profile/ProfileContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/use-toast";
import { UserMenu } from "@/components/auth/UserMenu";
import { AuthButtons } from "@/components/auth/AuthButtons";
import { AuthDialogContent } from "@/components/auth/AuthDialogContent";

const AuthDialog = () => {
  const { user, dispatch } = useUser();
  const { profile } = useProfile();
  const [isLoading, setIsLoading] = useState(false);
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [isPasswordReset, setIsPasswordReset] = useState(false);

  useEffect(() => {
    const showDialog = () => {
      setIsSignUp(false);
      setIsPasswordReset(false);
      setShowAuthDialog(true);
    };

    window.addEventListener("show-auth-dialog", showDialog);
    return () => window.removeEventListener("show-auth-dialog", showDialog);
  }, []);

  const { data: userRole } = useQuery({
    queryKey: ["userRole", user?.id],
    queryFn: async () => {
      if (!user) return null;
      
      console.log("Fetching user role for:", user.id);

      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .maybeSingle();

      if (roleError) {
        console.error("Error fetching role:", roleError);
        return "pet_lover";
      }

      const role = roleData?.role || "pet_lover";
      console.log("Role from database:", role);
      return role;
    },
    enabled: !!user,
  });

  const signInWithEmail = async (email: string, password: string) => {
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
      setShowAuthDialog(false);
      toast({
        title: "Success",
        description: "Successfully signed in",
      });
      return { };
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

  const signUp = async (email: string, password: string, firstName: string, lastName: string) => {
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
      setShowAuthDialog(false);
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

  const resetPasswordForEmail = async (email: string) => {
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
      setShowAuthDialog(false);
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

  const signOut = async () => {
    setIsLoading(true);
    try {
      console.log('Starting sign-out process');
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      // Dispatch sign out action to user context
      dispatch({ type: 'AUTH_SIGN_OUT' });
      
      // Reload the page to ensure a clean state
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

  const handleForgotPassword = () => {
    setIsPasswordReset(true);
    setIsSignUp(false);
  };

  return (
    <div className="flex gap-2 items-center">
      {user ? (
        <UserMenu
          profile={profile}
          userRole={userRole}
          onSignOut={signOut}
        />
      ) : (
        <>
          <AuthButtons
            isLoading={isLoading}
            onSignIn={() => {
              setIsSignUp(false);
              setIsPasswordReset(false);
              setShowAuthDialog(true);
            }}
            onSignUp={() => {
              setIsSignUp(true);
              setIsPasswordReset(false);
              setShowAuthDialog(true);
            }}
          />
          <AuthDialogContent
            isOpen={showAuthDialog}
            isSignUp={isSignUp}
            isPasswordReset={isPasswordReset}
            isLoading={isLoading}
            onOpenChange={setShowAuthDialog}
            onSignIn={signInWithEmail}
            onSignUp={signUp}
            onPasswordReset={resetPasswordForEmail}
            onToggleMode={setIsSignUp}
            onForgotPassword={handleForgotPassword}
          />
        </>
      )}
    </div>
  );
};

export default AuthDialog;
