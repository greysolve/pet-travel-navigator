
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/use-toast";

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

    await onPasswordReset(email);
  };

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
