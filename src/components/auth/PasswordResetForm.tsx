
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/use-toast";
import { MailIcon, AlertCircle } from "lucide-react";

interface PasswordResetFormProps {
  onPasswordReset: (email: string) => Promise<void>;
  isLoading: boolean;
  onToggleMode: () => void;
}

export const PasswordResetForm = ({ 
  onPasswordReset, 
  isLoading, 
  onToggleMode 
}: PasswordResetFormProps) => {
  const [email, setEmail] = useState("");
  const [emailSubmitted, setEmailSubmitted] = useState(false);
  const [emailError, setEmailError] = useState("");

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim()) {
      setEmailError("Email is required");
      return false;
    } else if (!emailRegex.test(email)) {
      setEmailError("Please enter a valid email address");
      return false;
    }
    setEmailError("");
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateEmail(email)) {
      return;
    }

    try {
      await onPasswordReset(email);
      setEmailSubmitted(true);
    } catch (error) {
      // Error is handled in onPasswordReset function
      console.error("Password reset submission error:", error);
    }
  };

  if (emailSubmitted) {
    return (
      <div className="space-y-6 text-center">
        <div className="flex justify-center">
          <div className="h-16 w-16 bg-green-100 rounded-full flex items-center justify-center">
            <MailIcon className="h-8 w-8 text-green-600" />
          </div>
        </div>
        <div className="space-y-2">
          <h3 className="text-xl font-medium">Check your email</h3>
          <p className="text-gray-600">
            We've sent a password reset link to <span className="font-medium">{email}</span>
          </p>
          <p className="text-sm text-gray-500 mt-2">
            If you don't see it, check your spam folder
          </p>
        </div>
        <div className="text-sm text-gray-500 mt-4">
          <p>The link will expire in 1 hour for security reasons.</p>
          <p className="mt-1">If you didn't receive an email or need a new link, you can:</p>
        </div>
        <div className="flex flex-col space-y-3 mt-2">
          <Button 
            onClick={() => setEmailSubmitted(false)} 
            variant="outline"
          >
            Try again
          </Button>
          <Button onClick={onToggleMode} variant="ghost">
            Back to Sign In
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold">Reset Password</h2>
        <p className="text-gray-600 mt-2">
          Enter your email address and we'll send you a link to reset your password
        </p>
      </div>
      
      <div className="grid gap-2">
        <Label htmlFor="reset-email">Email</Label>
        <Input
          id="reset-email"
          type="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (emailError) validateEmail(e.target.value);
          }}
          placeholder="Enter your email"
          required
          className={emailError ? "border-red-500" : ""}
        />
        {emailError && (
          <div className="text-sm text-red-500 flex items-center mt-1">
            <AlertCircle className="h-4 w-4 mr-1" />
            <span>{emailError}</span>
          </div>
        )}
      </div>
      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? "Sending..." : "Send Reset Link"}
      </Button>
      <div className="text-center text-sm">
        <button
          type="button"
          onClick={onToggleMode}
          className="text-blue-500 hover:underline"
        >
          Back to Sign In
        </button>
      </div>
    </form>
  );
};
