
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
          window.location.href = `/auth/reset-password${window.location.hash}`;
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
            window.location.href = "/";
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
              window.location.href = "/";
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
              window.location.href = "/";
            }
          }
        } else {
          console.log("AuthCallback: No session found, redirecting to home");
          if (mounted) {
            window.location.href = "/";
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
          window.location.href = "/";
        }
      } finally {
        if (mounted) {
          setIsLoadingCallback(false);
        }
      }
    };

    // Handle the callback
    handleAuthCallback();

    // Set up listener for auth state changes (mainly for sign-in completion)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;
      
      console.log("AuthCallback: Auth state changed:", event);
      if (event === "SIGNED_IN" && session) {
        try {
          console.log("AuthCallback: User signed in, verifying profile for user ID:", session.user.id);
          const { data: profile, error: profileError } = await supabase.rpc('get_profile_with_role', {
            p_user_id: session.user.id
          });

          console.log("AuthCallback: Profile RPC response on auth state change:", { profile, error: profileError });

          if (profileError || !profile) {
            console.error("AuthCallback: No valid profile found for user:", profileError);
            await supabase.auth.signOut();
            clearAuthData();
            toast({
              title: "Authentication Error",
              description: "Unable to verify your user role. Please contact support.",
              variant: "destructive",
            });
            if (mounted) window.location.href = "/";
            return;
          }

          if (mounted) {
            console.log("AuthCallback: Auth state change - signed in with valid role, redirecting to home");
            window.location.href = "/";
          }
        } catch (error) {
          console.error("AuthCallback: Error verifying profile on auth state change:", error);
          if (mounted) window.location.href = "/";
        }
      }
    });

    // Cleanup subscription and prevent state updates after unmount
    return () => {
      mounted = false;
      subscription.unsubscribe();
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
