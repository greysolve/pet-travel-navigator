
import { useState, useEffect } from "react";
import { useUser } from "@/contexts/user/UserContext";
import { useProfile } from "@/contexts/profile/ProfileContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { UserMenu } from "@/components/auth/UserMenu";
import { AuthButtons } from "@/components/auth/AuthButtons";
import { AuthDialogContent } from "@/components/auth/AuthDialogContent";
import { useAuth } from "@/hooks/useAuth";

export const AuthDialogManager = () => {
  const { user } = useUser();
  const { profile } = useProfile();
  const { isLoading, signInWithEmail, signUp, resetPasswordForEmail, signOut } = useAuth();
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
