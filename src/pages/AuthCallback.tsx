
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase, clearAuthData } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/use-toast";

const AuthCallback = () => {
  const navigate = useNavigate();
  const [isLoadingCallback, setIsLoadingCallback] = useState(true);
  const [processingMessage, setProcessingMessage] = useState("Completing sign in...");
  
  useEffect(() => {
    let mounted = true;
    const loadingTimeout = setTimeout(() => {
      if (mounted) {
        setProcessingMessage("This is taking longer than expected. Please wait...");
      }
    }, 5000);

    // Handle auth callback
    const handleAuthCallback = async () => {
      try {
        console.log("AuthCallback: Starting auth callback processing");
        
        // Check URL parameters
        const urlParams = new URLSearchParams(window.location.search);
        const resetPassword = urlParams.get('reset_password') === 'true';
        const type = urlParams.get('type');
        
        // If this is a password reset callback, redirect to the dedicated reset page
        if (resetPassword || type === 'recovery') {
          console.log("AuthCallback: Password reset detected, redirecting to reset page");
          window.location.href = `/auth/reset-password${window.location.hash}`;
          return;
        }
        
        // For regular auth callback, process normally
        console.log("AuthCallback: Regular auth callback, checking session");
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('AuthCallback: Session error:', sessionError);
          throw new Error(`Authentication error: ${sessionError.message}`);
        }
        
        if (!session) {
          console.log("AuthCallback: No session found after callback");
          toast({
            title: "Authentication Error",
            description: "No session was established. Please try signing in again.",
            variant: "destructive",
          });
          if (mounted) navigate("/");
          return;
        }

        // If session exists, we have successfully authenticated
        console.log("AuthCallback: Authentication successful, redirecting to home");
        if (mounted) {
          // Use window.location for a clean page load to avoid state issues
          window.location.href = "/";
        }
      } catch (error) {
        console.error("AuthCallback: General error:", error);
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

    // Cleanup
    return () => {
      mounted = false;
      clearTimeout(loadingTimeout);
    };
  }, [navigate]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center max-w-md p-8 bg-white rounded-lg shadow-md">
        <h2 className="text-2xl font-semibold mb-4">{processingMessage}</h2>
        <p className="text-gray-600 mb-4">You will be redirected shortly.</p>
        {isLoadingCallback && (
          <div className="flex justify-center">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuthCallback;
