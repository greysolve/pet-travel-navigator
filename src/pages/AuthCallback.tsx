
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/use-toast";

const AuthCallback = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // First handle the immediate auth callback
    const handleAuthCallback = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;
        
        if (session) {
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
            navigate("/");
            return;
          }

          console.log("Role verified, redirecting to home");
          navigate("/");
        }
      } catch (error) {
        console.error("Error in auth callback:", error);
        toast({
          title: "Authentication Error",
          description: "There was a problem signing you in. Please try again.",
          variant: "destructive",
        });
        navigate("/");
      }
    };

    // Handle the immediate callback
    handleAuthCallback();

    // Set up listener for future auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("Auth state changed:", event);
      if (event === "SIGNED_IN" && session) {
        // Verify role on sign in
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

        console.log("Auth callback - signed in with valid role, redirecting to home");
        navigate("/");
      }
    });

    // Cleanup subscription on unmount
    return () => {
      subscription.unsubscribe();
    };
  }, [navigate]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <h2 className="text-2xl font-semibold mb-4">Completing sign in...</h2>
        <p>You will be redirected shortly.</p>
      </div>
    </div>
  );
};

export default AuthCallback;
