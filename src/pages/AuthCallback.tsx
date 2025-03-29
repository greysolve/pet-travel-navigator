
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/use-toast";
import { UpdatePasswordForm } from "@/components/auth/UpdatePasswordForm";
import { useAuth } from "@/contexts/AuthContext";

const AuthCallback = () => {
  const navigate = useNavigate();
  const { updatePassword } = useAuth();
  const [isLoadingCallback, setIsLoadingCallback] = useState(true);
  const [showPasswordReset, setShowPasswordReset] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState<string | null>(null);
  
  useEffect(() => {
    let mounted = true;

    // Check for password reset flow first
    const handlePasswordResetFlow = async () => {
      // Check URL parameters
      const urlParams = new URLSearchParams(window.location.search);
      const needsPasswordReset = urlParams.get('reset_password') === 'true';
      const type = urlParams.get('type');
      
      // Sign out any currently logged in user when a password reset is detected
      // This prevents the password reset link from being used as a magic link
      if (needsPasswordReset || type === 'recovery') {
        console.log("Password reset flow detected - signing out any existing users");
        await supabase.auth.signOut();
        
        // Get email from the recovery token
        try {
          const { data: { user }, error } = await supabase.auth.getUser();
          
          if (error) {
            console.error("Error getting user from recovery token:", error);
            toast({
              title: "Password Reset Error",
              description: "The password reset link is invalid or has expired. Please request a new one.",
              variant: "destructive",
            });
            if (mounted) {
              navigate("/");
            }
            return;
          }
          
          if (user && user.email) {
            console.log("Valid recovery flow for:", user.email);
            setResetEmail(user.email);
            setShowPasswordReset(true);
            setIsLoadingCallback(false);
          } else {
            console.error("No user email found in recovery token");
            toast({
              title: "Password Reset Error",
              description: "The password reset link is invalid or has expired. Please request a new one.",
              variant: "destructive",
            });
            if (mounted) {
              navigate("/");
            }
          }
        } catch (error) {
          console.error("Error processing recovery token:", error);
          toast({
            title: "Password Reset Error",
            description: "There was an error processing your password reset. Please try again.",
            variant: "destructive",
          });
          if (mounted) {
            navigate("/");
          }
        }
        return;
      }

      // Handle regular auth callback
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;
        
        if (session && mounted) {
          console.log("Auth callback - session found, checking role");
          // Check if user has a role by attempting to fetch their profile
          const { data: profile, error: profileError } = await supabase.rpc('get_profile_with_role', {
            p_user_id: session.user.id
          });

          if (profileError || !profile) {
            console.error("No valid role found for user:", profileError);
            await supabase.auth.signOut();
            toast({
              title: "Authentication Error",
              description: "Unable to verify your user role. Please contact support.",
              variant: "destructive",
            });
            if (mounted) navigate("/");
            return;
          }

          console.log("Role verified, redirecting to home");
          if (mounted) navigate("/");
        } else {
          setIsLoadingCallback(false);
        }
      } catch (error) {
        console.error("Error in auth callback:", error);
        toast({
          title: "Authentication Error",
          description: "There was a problem signing you in. Please try again.",
          variant: "destructive",
        });
        if (mounted) navigate("/");
      } finally {
        if (mounted) {
          setIsLoadingCallback(false);
        }
      }
    };

    // Handle the immediate callback
    handlePasswordResetFlow();

    // Set up listener for future auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;
      
      console.log("Auth state changed:", event);
      if (event === "SIGNED_IN" && session) {
        const { data: profile, error: profileError } = await supabase.rpc('get_profile_with_role', {
          p_user_id: session.user.id
        });

        if (profileError || !profile) {
          console.error("No valid role found for user:", profileError);
          await supabase.auth.signOut();
          toast({
            title: "Authentication Error",
            description: "Unable to verify your user role. Please contact support.",
            variant: "destructive",
          });
          return;
        }

        if (mounted) {
          console.log("Auth callback - signed in with valid role, redirecting to home");
          navigate("/");
        }
      }
    });

    // Cleanup subscription and prevent state updates after unmount
    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [navigate, updatePassword]);

  const handleUpdatePassword = async (newPassword: string) => {
    setIsUpdatingPassword(true);
    try {
      const result = await updatePassword(newPassword);
      if (result?.error) {
        throw result.error;
      }
      toast({
        title: "Password Updated",
        description: "Your password has been successfully updated. You can now sign in with your new password.",
      });
      navigate("/");
    } catch (error: any) {
      console.error("Error updating password:", error);
      toast({
        title: "Error updating password",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  if (showPasswordReset) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 px-4">
        <div className="w-full max-w-md p-8 space-y-8 bg-white rounded-lg shadow-lg">
          <div className="text-center">
            <h2 className="text-3xl font-bold">Reset Your Password</h2>
            {resetEmail && (
              <p className="mt-2 text-gray-600">
                Create a new password for <span className="font-medium">{resetEmail}</span>
              </p>
            )}
            {!resetEmail && (
              <p className="mt-2 text-gray-600">
                Please create a new password for your account
              </p>
            )}
          </div>
          <UpdatePasswordForm 
            onUpdatePassword={handleUpdatePassword}
            isLoading={isUpdatingPassword}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <h2 className="text-2xl font-semibold mb-4">{isLoadingCallback ? "Completing sign in..." : "Processing authentication..."}</h2>
        <p>You will be redirected shortly.</p>
      </div>
    </div>
  );
};

export default AuthCallback;
