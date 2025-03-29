
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase, clearAuthData } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/use-toast";
import { UpdatePasswordForm } from "@/components/auth/UpdatePasswordForm";
import { AlertCircle, AlertTriangle } from "lucide-react";

const PasswordReset = () => {
  const navigate = useNavigate();
  const [isLoadingCallback, setIsLoadingCallback] = useState(true);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState<string | null>(null);
  const [tokenValid, setTokenValid] = useState(false);
  const [tokenError, setTokenError] = useState<string | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  
  useEffect(() => {
    let mounted = true;
    
    const verifyResetToken = async () => {
      try {
        console.log("PasswordReset: Verifying password reset token...");
        
        // Force sign out and clear any existing session first
        await supabase.auth.signOut();
        clearAuthData();
        
        // Check for token_hash in the URL (new format)
        const urlParams = new URLSearchParams(window.location.search);
        const tokenHash = urlParams.get('token_hash');
        const type = urlParams.get('type');
        
        console.log("PasswordReset: URL parameters:", {
          hasTokenHash: !!tokenHash,
          type,
          fullUrl: window.location.href
        });
        
        // If we have token_hash parameter, we're using the new reset flow
        if (tokenHash && type === 'recovery') {
          console.log("PasswordReset: Using token_hash format");
          
          try {
            // Process the hash directly with Supabase
            const { data, error } = await supabase.auth.verifyOtp({
              token_hash: tokenHash,
              type: 'recovery'
            });
            
            if (error) {
              console.error("PasswordReset: Error verifying OTP:", error);
              setTokenError("The password reset link is invalid or has expired. Please request a new one.");
              setIsLoadingCallback(false);
              return;
            }
            
            if (data.session) {
              console.log("PasswordReset: Valid session from OTP verification", {
                user: data.session.user.id,
                email: data.session.user.email
              });
              
              // Store tokens for password update
              setAccessToken(data.session.access_token);
              setRefreshToken(data.session.refresh_token);
              setResetEmail(data.session.user.email);
              setTokenValid(true);
            } else {
              console.error("PasswordReset: No session from OTP verification");
              setTokenError("The password reset verification failed. Please try again.");
            }
            
            setIsLoadingCallback(false);
            return;
          } catch (error) {
            console.error("PasswordReset: Error in OTP verification:", error);
            setTokenError("An error occurred while verifying your reset link. Please request a new one.");
            setIsLoadingCallback(false);
            return;
          }
        }
        
        // Get hash parameters from URL (old format with hash)
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const accessTokenFromUrl = hashParams.get('access_token');
        const refreshTokenFromUrl = hashParams.get('refresh_token');
        const hashType = hashParams.get('type');
        
        console.log("PasswordReset: Hash info:", { 
          hasAccessToken: !!accessTokenFromUrl, 
          hasRefreshToken: !!refreshTokenFromUrl, 
          type: hashType 
        });
        
        if (!accessTokenFromUrl || !refreshTokenFromUrl || hashType !== 'recovery') {
          console.error("Invalid or missing token parameters:", { 
            hasAccessToken: !!accessTokenFromUrl, 
            hasRefreshToken: !!refreshTokenFromUrl, 
            type: hashType
          });
          setTokenError("The password reset link is invalid or has expired. Please request a new one.");
          setIsLoadingCallback(false);
          return;
        }
        
        // Store the tokens for later use
        setAccessToken(accessTokenFromUrl);
        setRefreshToken(refreshTokenFromUrl);
        
        // Verify the token
        try {
          // Extract user email from JWT
          const base64Url = accessTokenFromUrl.split('.')[1];
          const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
          const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
          }).join(''));
          
          const payload = JSON.parse(jsonPayload);
          const email = payload.email;
          
          console.log("PasswordReset: Valid recovery token for email:", email);
          setResetEmail(email);
          setTokenValid(true);
          setIsLoadingCallback(false);
        } catch (error) {
          console.error("Error processing recovery token:", error);
          setTokenError("There was an error verifying your password reset link. Please request a new one.");
          setIsLoadingCallback(false);
        }
      } catch (error) {
        console.error("Error processing recovery token:", error);
        setTokenError("There was an error processing your password reset. Please try again.");
        setIsLoadingCallback(false);
      }
    };

    verifyResetToken();
    
    return () => {
      mounted = false;
    };
  }, []);

  const handleUpdatePassword = async (newPassword: string) => {
    setIsUpdatingPassword(true);
    try {
      if (!accessToken || !refreshToken) {
        throw new Error("Missing recovery tokens. Please try again with a new reset link.");
      }
      
      console.log("PasswordReset: Starting password update process...");
      
      // Create a temporary session just for the password update
      // Important: This session will be immediately terminated after the update
      const { data, error: sessionError } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken
      });
      
      if (sessionError) {
        console.error("PasswordReset: Error setting temporary session:", sessionError);
        throw sessionError;
      }
      
      if (!data.session) {
        console.error("PasswordReset: Failed to create temporary session");
        throw new Error("Failed to authenticate with recovery tokens");
      }
      
      // Verify that the authenticated user matches the expected email
      if (data.session.user.email !== resetEmail) {
        console.error(`PasswordReset: Token mismatch: Expected ${resetEmail} but got ${data.session.user.email}`);
        throw new Error("Security error: User mismatch");
      }
      
      console.log("PasswordReset: Temporary session created for user:", data.session.user.email);
      
      // Update the password
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });
      
      if (error) {
        console.error("PasswordReset: Error updating password:", error);
        throw error;
      }
      
      console.log("PasswordReset: Password updated successfully");
      
      // Sign out immediately and clear all auth data to ensure no lingering session
      await supabase.auth.signOut();
      clearAuthData();
      
      toast({
        title: "Password Updated",
        description: "Your password has been successfully updated. You can now sign in with your new password.",
      });
      
      // Redirect to home
      navigate("/");
    } catch (error: any) {
      console.error("PasswordReset: Error in password update process:", error);
      
      // Ensure we're signed out in case of error
      await supabase.auth.signOut();
      clearAuthData();
      
      toast({
        title: "Error updating password",
        description: error.message || "Failed to update your password. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  if (isLoadingCallback) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-semibold mb-4">Verifying password reset link...</h2>
          <p>Please wait while we process your request.</p>
        </div>
      </div>
    );
  }

  if (tokenError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 px-4">
        <div className="w-full max-w-md p-8 space-y-8 bg-white rounded-lg shadow-lg">
          <div className="flex justify-center">
            <div className="h-16 w-16 bg-red-100 rounded-full flex items-center justify-center">
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
          </div>
          <div className="text-center">
            <h2 className="text-3xl font-bold">Reset Link Invalid</h2>
            <p className="mt-2 text-gray-600">{tokenError}</p>
          </div>
          <button
            onClick={() => navigate("/")}
            className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Return to Home
          </button>
        </div>
      </div>
    );
  }

  if (tokenValid) {
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
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 px-4">
      <div className="w-full max-w-md p-8 space-y-8 bg-white rounded-lg shadow-lg">
        <div className="flex justify-center">
          <div className="h-16 w-16 bg-yellow-100 rounded-full flex items-center justify-center">
            <AlertCircle className="h-8 w-8 text-yellow-600" />
          </div>
        </div>
        <div className="text-center">
          <h2 className="text-3xl font-bold">Something Went Wrong</h2>
          <p className="mt-2 text-gray-600">
            We couldn't process your password reset request. Please try again.
          </p>
        </div>
        <button
          onClick={() => navigate("/")}
          className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Return to Home
        </button>
      </div>
    </div>
  );
};

export default PasswordReset;
