
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
        const code = urlParams.get('code');
        
        // If explicit reset password parameter is found, redirect immediately
        if (resetPassword || type === 'recovery') {
          console.log("AuthCallback: Explicit password reset detected, redirecting to reset page");
          
          // Important: Use replace to preserve the hash fragment containing the tokens
          window.location.replace(`/auth/reset-password${window.location.hash}`);
          return;
        }
        
        // Check if this is an auth code and might be a password reset
        if (code) {
          console.log("AuthCallback: Auth code detected, checking if it's a password reset");
          
          try {
            // Exchange the code for a session to determine if it's a password reset
            const { data, error } = await supabase.auth.exchangeCodeForSession(code);
            
            if (error) {
              console.error("AuthCallback: Error exchanging code for session:", error);
              throw error;
            }
            
            // Check if this is a recovery/reset token (either from type in JWT or just a recovery flow)
            // The access token is a JWT that contains user info and claims we can check
            if (data?.session) {
              // Use a helper function to parse JWT and check if it's a recovery token
              const isRecoveryFlow = checkIfRecoveryToken(data.session.access_token);
              
              if (isRecoveryFlow) {
                console.log("AuthCallback: Recovery flow detected from token claims");
                
                // Redirect to the password reset page with the tokens
                // We need to add the tokens to the hash for the reset password page to use
                const hash = `#access_token=${data.session.access_token}&refresh_token=${data.session.refresh_token}&type=recovery`;
                
                // Make sure not to set any session state before redirecting
                // We want the reset password page to handle the auth flow
                await supabase.auth.signOut();
                clearAuthData();
                
                if (mounted) {
                  window.location.replace(`/auth/reset-password${hash}`);
                }
                return;
              }
              
              // If it's not a recovery flow, proceed with normal login
              console.log("AuthCallback: Regular authentication with code");
              
              // Check the user's role and redirect
              await handleSuccessfulAuth(data.session);
              return;
            }
          } catch (error) {
            console.error("AuthCallback: Error processing auth code:", error);
            toast({
              title: "Authentication Error",
              description: "Error processing authentication code. Please try again.",
              variant: "destructive",
            });
            if (mounted) {
              navigate("/");
            }
            return;
          }
        }
        
        // For regular auth callback, process normally
        console.log("AuthCallback: Checking for existing session");
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
          await handleSuccessfulAuth(session);
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

    // Helper function to check if a token is for password reset
    const checkIfRecoveryToken = (token: string): boolean => {
      try {
        // Parse the JWT token
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
          return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        
        const payload = JSON.parse(jsonPayload);
        
        // Add extensive logging for debugging
        console.log("Token Payload:", JSON.stringify(payload, null, 2));
        console.log("Token type:", payload.type);
        console.log("Token AAL:", payload.aal);
        console.log("Token recovery conditions:", {
          typeIsRecovery: payload.type === 'recovery',
          aalIsAal1: payload.aal === 'aal1'
        });
        
        // Additional token properties that might indicate recovery
        console.log("Additional token properties:", {
          amr: payload.amr, // Authentication method reference
          'https://hasura.io/jwt/claims': payload['https://hasura.io/jwt/claims'],
          sub: payload.sub,
          email: payload.email,
          exp: new Date(payload.exp * 1000).toISOString(),
          iat: new Date(payload.iat * 1000).toISOString(),
        });
        
        // Check if the token is for recovery
        const isRecovery = payload.type === 'recovery' || payload.aal === 'aal1';
        console.log("Final recovery determination:", isRecovery);
        
        return isRecovery;
      } catch (error) {
        console.error("Error parsing token:", error);
        return false;
      }
    };

    // Handle successful authentication by verifying user role
    const handleSuccessfulAuth = async (session: any) => {
      if (!session || !mounted) return;
      
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
