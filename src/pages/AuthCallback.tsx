
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase, clearAuthData } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/use-toast";

const AuthCallback = () => {
  const navigate = useNavigate();
  const [isLoadingCallback, setIsLoadingCallback] = useState(true);
  
  useEffect(() => {
    let mounted = true;

    // Handle auth callback
    const handleAuthCallback = async () => {
      try {
        console.log("AuthCallback: Starting auth callback processing");
        
        // Check URL parameters
        const urlParams = new URLSearchParams(window.location.search);
        const resetPassword = urlParams.get('reset_password') === 'true';
        const type = urlParams.get('type');
        
        // If this is a password reset callback, redirect to the dedicated reset page
        // and preserve the hash fragment which contains the tokens
        if (resetPassword || type === 'recovery') {
          console.log("AuthCallback: Password reset detected, redirecting to reset page");
          
          // Important: Use replace to preserve the hash fragment containing the tokens
          // And make sure we don't set any session state before redirecting
          window.location.replace(`/auth/reset-password${window.location.hash}`);
          return;
        }
        
        // For regular auth callback, process normally
        console.log("AuthCallback: Regular auth callback, checking session");
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('AuthCallback: Session error:', sessionError);
          toast({
            title: "Authentication Error",
            description: "There was a problem signing you in. Please try again.",
            variant: "destructive",
          });
          if (mounted) {
            console.log("AuthCallback: Redirecting to home due to session error");
            navigate("/");
          }
          return;
        }
        
        if (session) {
          console.log("AuthCallback: Session found, checking role for user ID:", session.user.id);
          try {
            // Check if user has a role by attempting to fetch their profile
            const { data: profile, error: profileError } = await supabase.rpc('get_profile_with_role', {
              p_user_id: session.user.id
            });

            console.log("AuthCallback: Profile RPC response:", { profile, error: profileError });

            if (profileError) {
              console.error("AuthCallback: Profile RPC error:", profileError);
              throw new Error(`No valid profile found: ${profileError.message}`);
            }

            if (!profile) {
              console.error("AuthCallback: No profile returned from RPC");
              throw new Error("No valid profile found");
            }

            console.log("AuthCallback: Role verified, redirecting to home");
            if (mounted) {
              navigate("/");
            }
          } catch (error) {
            console.error("AuthCallback: Error verifying user role:", error);
            await supabase.auth.signOut();
            clearAuthData();
            toast({
              title: "Authentication Error",
              description: "Unable to verify your user role. Please contact support.",
              variant: "destructive",
            });
            if (mounted) {
              navigate("/");
            }
          }
        } else {
          console.log("AuthCallback: No session found, redirecting to home");
          if (mounted) {
            navigate("/");
          }
        }
      } catch (error) {
        console.error("AuthCallback: General error:", error);
        toast({
          title: "Authentication Error",
          description: "There was a problem during authentication. Please try again.",
          variant: "destructive",
        });
        if (mounted) {
          navigate("/");
        }
      } finally {
        if (mounted) {
          setIsLoadingCallback(false);
        }
      }
    };

    // Handle the callback
    handleAuthCallback();

    // Cleanup function
    return () => {
      mounted = false;
    };
  }, [navigate]);

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
