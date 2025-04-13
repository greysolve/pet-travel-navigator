
import { useState, useEffect } from "react";
import { useUser } from "@/contexts/user/UserContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/use-toast";
import { UserMenu } from "@/components/auth/UserMenu";
import { AuthButtons } from "@/components/auth/AuthButtons";
import { AuthDialogContent } from "@/components/auth/AuthDialogContent";
import { useAuthOperations } from "@/hooks/useAuthOperations";

const AuthDialog = () => {
  const { user, profile } = useUser();
  const { signInWithEmail, signUp, signOut, resetPasswordForEmail } = useAuthOperations();
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

  const handleSignIn = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const result = await signInWithEmail(email, password);
      if (result?.error) {
        throw result.error;
      }
      setShowAuthDialog(false);
      toast({
        title: "Success",
        description: "Successfully signed in",
      });
    } catch (error: any) {
      console.error("Sign in error:", error);
      toast({
        title: "Error signing in",
        description: error.message === "Invalid login credentials" 
          ? "Invalid email or password. Please try again."
          : error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async (email: string, password: string, firstName: string, lastName: string) => {
    setIsLoading(true);
    try {
      await signUp(email, password, `${firstName.trim()} ${lastName.trim()}`);
      toast({
        title: "Success",
        description: "Please check your email to verify your account.",
      });
      setShowAuthDialog(false);
    } catch (error: any) {
      console.error("Sign up error:", error);
      toast({
        title: "Error signing up",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordReset = async (email: string) => {
    setIsLoading(true);
    try {
      const result = await resetPasswordForEmail(email);
      if (result?.error) {
        throw result.error;
      }
      setShowAuthDialog(false);
    } catch (error: any) {
      console.error("Password reset error:", error);
      toast({
        title: "Error resetting password",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = async () => {
    setIsLoading(true);
    try {
      await signOut();
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
          onSignOut={handleSignOut}
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
            onSignIn={handleSignIn}
            onSignUp={handleSignUp}
            onPasswordReset={handlePasswordReset}
            onToggleMode={setIsSignUp}
            onForgotPassword={handleForgotPassword}
          />
        </>
      )}
    </div>
  );
};

export default AuthDialog;
