
import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/use-toast";
import { UpdatePasswordForm } from "@/components/auth/UpdatePasswordForm";
import { AlertCircle } from "lucide-react";

const PasswordReset = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [hasValidSession, setHasValidSession] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  
  useEffect(() => {
    // Check if we have a valid session from token verification
    const checkSession = async () => {
      try {
        console.log("PasswordReset: Checking for active session...");
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error("PasswordReset: Error getting session:", error);
          throw error;
        }
        
        if (!session) {
          console.error("PasswordReset: No active session found");
          throw new Error("No active session found. Please try again with a new reset link.");
        }
        
        console.log("PasswordReset: Found active session for user:", session.user.email);
        setHasValidSession(true);
      } catch (error: any) {
        console.error("PasswordReset: Session check error:", error);
        toast({
          title: "Session Error",
          description: "Your password reset link has expired or is invalid. Please request a new link.",
          variant: "destructive",
        });
        // Navigate back to home after a short delay
        setTimeout(() => navigate("/"), 3000);
      } finally {
        setIsCheckingSession(false);
      }
    };
    
    checkSession();
  }, [navigate]);
  
  const handleUpdatePassword = async (newPassword: string) => {
    setIsUpdatingPassword(true);
    try {
      console.log("PasswordReset: Starting password update process...");
      
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });
      
      if (error) {
        console.error("PasswordReset: Error updating password:", error);
        throw error;
      }
      
      console.log("PasswordReset: Password updated successfully");
      
      toast({
        title: "Password Updated",
        description: "Your password has been successfully updated. You can now sign in with your new password.",
      });
      
      // Redirect to home
      navigate("/");
    } catch (error: any) {
      console.error("PasswordReset: Error in password update process:", error);
      
      toast({
        title: "Error updating password",
        description: error.message || "Failed to update your password. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  if (isCheckingSession) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-semibold mb-4">Verifying session...</h2>
          <p>Please wait while we verify your reset link.</p>
        </div>
      </div>
    );
  }

  if (!hasValidSession) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 px-4">
        <div className="w-full max-w-md p-8 space-y-8 bg-white rounded-lg shadow-lg">
          <div className="text-center text-red-600">
            <AlertCircle className="mx-auto h-12 w-12 mb-4" />
            <h2 className="text-3xl font-bold">Invalid Session</h2>
            <p className="mt-2 text-gray-600">
              Your password reset link has expired or is invalid. You will be redirected to the home page.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 px-4">
      <div className="w-full max-w-md p-8 space-y-8 bg-white rounded-lg shadow-lg">
        <div className="text-center">
          <h2 className="text-3xl font-bold">Reset Your Password</h2>
          <p className="mt-2 text-gray-600">
            Create a new password for your account
          </p>
        </div>
        <UpdatePasswordForm 
          onUpdatePassword={handleUpdatePassword}
          isLoading={isUpdatingPassword}
        />
      </div>
    </div>
  );
};

export default PasswordReset;
