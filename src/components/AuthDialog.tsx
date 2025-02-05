import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SignUpForm } from "./auth/SignUpForm";
import { SignInForm } from "./auth/SignInForm";

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

      // First check user metadata
      if (user.user_metadata?.role === "site_manager") {
        console.log("Role found in metadata:", user.user_metadata.role);
        return "site_manager";
      }

      // If not in metadata, check the user_roles table
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) {
        console.error("Error fetching user role:", error);
        return "pet_lover"; // Default to pet_lover on error
      }

      if (!data) {
        console.log("No role found in database, creating default role");
        // Insert default role
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

  const getFirstName = () => {
    if (!profile?.full_name) return "";
    return profile.full_name.split(" ")[0];
  };

  const getInitials = () => {
    if (!profile?.full_name) return "";
    const names = profile.full_name.split(" ");
    return names.map(name => name[0]).join("").toUpperCase();
  };

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
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              className="bg-sky-100 hover:bg-sky-200 flex items-center gap-2"
            >
              <Avatar className="h-6 w-6">
                <AvatarImage src={profile?.avatar_url} />
                <AvatarFallback>{getInitials()}</AvatarFallback>
              </Avatar>
              {getFirstName()}
              <ChevronDown className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            {userRole === "site_manager" && (
              <DropdownMenuItem onClick={() => navigate("/admin")}>
                Manage
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={() => navigate("/profile")}>
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleSignOut}>
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => {
              setIsSignUp(false);
              setShowAuthDialog(true);
            }}
            disabled={isLoading}
            className="bg-sky-100 hover:bg-sky-200"
          >
            Sign In
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setIsSignUp(true);
              setShowAuthDialog(true);
            }}
            disabled={isLoading}
            className="bg-sky-100 hover:bg-sky-200"
          >
            Sign Up
          </Button>
          
          <Dialog open={showAuthDialog} onOpenChange={(open) => {
            setShowAuthDialog(open);
            if (!open) {
              setIsSignUp(false);
            }
          }}>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>{isSignUp ? "Sign Up" : "Sign In"}</DialogTitle>
                <DialogDescription>
                  {isSignUp 
                    ? "Create an account to get started"
                    : "Welcome back! Please sign in to continue"
                  }
                </DialogDescription>
              </DialogHeader>
              {isSignUp ? (
                <SignUpForm
                  onSignUp={handleSignUp}
                  isLoading={isLoading}
                  onToggleMode={() => setIsSignUp(false)}
                />
              ) : (
                <SignInForm
                  onSignIn={handleSignIn}
                  isLoading={isLoading}
                  onToggleMode={() => setIsSignUp(true)}
                />
              )}
            </DialogContent>
          </Dialog>
        </div>
      )}
    </div>
  );
};

export default AuthDialog;