
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase, clearAuthData } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/use-toast";
import { useAuth } from "@/contexts/AuthContext";

const AuthCallback = () => {
  const navigate = useNavigate();
  const { updatePassword } = useAuth();
  const [isLoadingCallback, setIsLoadingCallback] = useState(true);
  
  useEffect(() => {
    let mounted = true;

    // Handle auth callback
    const handleAuthCallback = async () => {
      try {
        // Check URL parameters
        const urlParams = new URLSearchParams(window.location.search);
        const resetPassword = urlParams.get('reset_password') === 'true';
        const type = urlParams.get('type');
        
        // If this is a password reset callback, redirect to the dedicated reset page
        // and preserve the hash fragment which contains the tokens
        if (resetPassword || type === 'recovery') {
          console.log("Password reset detected, redirecting to dedicated reset page with hash preserved");
          
          // Important: Use replace to preserve the hash fragment containing the tokens
          const redirectUrl = `/auth/reset-password${window.location.hash}`;
          window.location.replace(redirectUrl);
          return;
        }
        
        // For regular auth callback, process normally
        console.log("Regular auth callback, checking session");
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('Session error:', sessionError);
          toast({
            title: "Authentication Error",
            description: "There was a problem signing you in. Please try again.",
            variant: "destructive",
          });
          if (mounted) navigate("/");
          return;
        }
        
        if (session) {
          console.log("Session found, checking role");
          // Check if user has a role by attempting to fetch their profile
          const { data: profile, error: profileError } = await supabase.rpc('get_profile_with_role', {
            p_user_id: session.user.id
          });

          if (profileError || !profile) {
            console.error("No valid role found for user:", profileError);
            await supabase.auth.signOut();
            clearAuthData();
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
          console.log("No session found");
          if (mounted) navigate("/");
        }
      } catch (error) {
        console.error("Error in auth callback:", error);
        toast({
          title: "Authentication Error",
          description: "There was a problem during authentication. Please try again.",
          variant: "destructive",
        });
        if (mounted) navigate("/");
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
      
      console.log("Auth state changed:", event);
      if (event === "SIGNED_IN" && session) {
        const { data: profile, error: profileError } = await supabase.rpc('get_profile_with_role', {
          p_user_id: session.user.id
        });

        if (profileError || !profile) {
          console.error("No valid role found for user:", profileError);
          await supabase.auth.signOut();
          clearAuthData();
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
