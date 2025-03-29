
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/use-toast";
import { UpdatePasswordForm } from "@/components/auth/UpdatePasswordForm";
import { AlertCircle } from "lucide-react";

const PasswordReset = () => {
  const navigate = useNavigate();
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  
  const handleUpdatePassword = async (newPassword: string) => {
    setIsUpdatingPassword(true);
    try {
      console.log("PasswordReset: Starting password update process...");
      
      // Check if we have a session from the token verification
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error("PasswordReset: Error getting session:", sessionError);
        throw sessionError;
      }
      
      if (!session) {
        console.error("PasswordReset: No active session found");
        throw new Error("No active session found. Please try again with a new reset link.");
      }
      
      console.log("PasswordReset: Found active session for user:", session.user.email);
      
      // Update the password
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
