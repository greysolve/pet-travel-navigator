
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/use-toast";
import { MailIcon } from "lucide-react";

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      toast({
        title: "Error",
        description: "Email is required",
        variant: "destructive",
      });
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
        <Button onClick={onToggleMode} variant="outline" className="mt-4 w-full">
          Back to Sign In
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-2">
        <Label htmlFor="reset-email">Email</Label>
        <Input
          id="reset-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Enter your email"
          required
        />
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
