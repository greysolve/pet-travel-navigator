
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase, clearAuthData } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/use-toast";
import { UpdatePasswordForm } from "@/components/auth/UpdatePasswordForm";
import { useAuth } from "@/contexts/AuthContext";
import { AlertCircle, AlertTriangle } from "lucide-react";

const PasswordReset = () => {
  const navigate = useNavigate();
  const { updatePassword } = useAuth();
  const [isLoadingCallback, setIsLoadingCallback] = useState(true);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState<string | null>(null);
  const [tokenValid, setTokenValid] = useState(false);
  const [tokenError, setTokenError] = useState<string | null>(null);
  
  useEffect(() => {
    let mounted = true;
    
    const verifyResetToken = async () => {
      try {
        console.log("Verifying password reset token...");
        
        // Force sign out and clear any existing session first
        await supabase.auth.signOut();
        clearAuthData();
        
        // Get hash parameters from URL
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');
        const type = hashParams.get('type');
        
        if (!accessToken || !refreshToken || type !== 'recovery') {
          console.error("Invalid or missing token parameters");
          setTokenError("The password reset link is invalid or has expired. Please request a new one.");
          setIsLoadingCallback(false);
          return;
        }
        
        // Set the session manually using the recovery tokens
        const { data, error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken
        });
        
        if (error || !data.session) {
          console.error("Error setting recovery session:", error);
          setTokenError("The password reset link is invalid or has expired. Please request a new one.");
          setIsLoadingCallback(false);
          return;
        }
        
        // Get the user from the recovery token
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        
        if (userError || !user) {
          console.error("Error getting user from recovery token:", userError);
          setTokenError("Unable to verify your identity. Please request a new password reset link.");
          setIsLoadingCallback(false);
          return;
        }
        
        console.log("Valid recovery token for:", user.email);
        setResetEmail(user.email);
        setTokenValid(true);
        setIsLoadingCallback(false);
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
      const result = await updatePassword(newPassword);
      if (result?.error) {
        throw result.error;
      }
      toast({
        title: "Password Updated",
        description: "Your password has been successfully updated. You can now sign in with your new password.",
      });
      
      // Sign out after successful password reset to ensure clean slate
      await supabase.auth.signOut();
      clearAuthData();
      
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
