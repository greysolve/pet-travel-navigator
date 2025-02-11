
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

const AuthCallback = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // First handle the immediate auth callback
    const handleAuthCallback = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;
        
        if (session) {
          console.log("Auth callback - session found, redirecting to home");
          navigate("/");
        }
      } catch (error) {
        console.error("Error in auth callback:", error);
        navigate("/");
      }
    };

    // Handle the immediate callback
    handleAuthCallback();

    // Set up listener for future auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("Auth state changed:", event);
      if (event === "SIGNED_IN" && session) {
        console.log("Auth callback - signed in, redirecting to home");
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

