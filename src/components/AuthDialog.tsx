import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { toast } from "@/components/ui/use-toast";
import { UserMenu } from "@/components/auth/UserMenu";
import { AuthButtons } from "@/components/auth/AuthButtons";
import { AuthDialogContent } from "@/components/auth/AuthDialogContent";

const AuthDialog = () => {
  const { user, profile, signInWithEmail, signUp, signOut } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);

  const { data: userRole } = useQuery({
    queryKey: ["userRole", user?.id],
    queryFn: async () => {
      if (!user) return null;
      
      console.log("Fetching user role for:", user.id);

      if (user.user_metadata?.role === "site_manager") {
        console.log("Role found in metadata:", user.user_metadata.role);
        return "site_manager";
      }

      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) {
        console.error("Error fetching user role:", error);
        return "pet_lover";
      }

      if (!data) {
        console.log("No role found in database, creating default role");
        const { error: insertError } = await supabase
          .from("user_roles")
          .insert({
            user_id: user.id,
            role: "pet_lover"
          });

        if (insertError) {
          console.error("Error inserting default role:", insertError);
        }
        return "pet_lover";
      }

      console.log("Role from database:", data.role);
      return data.role;
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

  const handleSignOut = async () => {
    setIsLoading(true);
    try {
      await signOut();
      navigate("/");
    } catch (error: any) {
      toast({
        title: "Error signing out",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
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
              setShowAuthDialog(true);
            }}
            onSignUp={() => {
              setIsSignUp(true);
              setShowAuthDialog(true);
            }}
          />
          <AuthDialogContent
            isOpen={showAuthDialog}
            isSignUp={isSignUp}
            isLoading={isLoading}
            onOpenChange={setShowAuthDialog}
            onSignIn={handleSignIn}
            onSignUp={handleSignUp}
            onToggleMode={setIsSignUp}
          />
        </>
      )}
    </div>
  );
};

export default AuthDialog;