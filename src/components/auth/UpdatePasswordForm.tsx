
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/use-toast";
import { AlertCircle } from "lucide-react";

interface UpdatePasswordFormProps {
  onUpdatePassword: (password: string) => Promise<void>;
  isLoading: boolean;
}

export const UpdatePasswordForm = ({ onUpdatePassword, isLoading }: UpdatePasswordFormProps) => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordStrength, setPasswordStrength] = useState<"weak" | "medium" | "strong" | null>(null);

  const checkPasswordStrength = (pwd: string) => {
    if (!pwd) return null;
    
    // Basic strength checks
    const hasLowerCase = /[a-z]/.test(pwd);
    const hasUpperCase = /[A-Z]/.test(pwd);
    const hasNumber = /\d/.test(pwd);
    const hasSpecialChar = /[^A-Za-z0-9]/.test(pwd);
    const isLongEnough = pwd.length >= 8;
    
    const score = [hasLowerCase, hasUpperCase, hasNumber, hasSpecialChar, isLongEnough].filter(Boolean).length;
    
    if (score <= 2) return "weak";
    if (score <= 4) return "medium";
    return "strong";
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newPassword = e.target.value;
    setPassword(newPassword);
    setPasswordStrength(checkPasswordStrength(newPassword));
  };

  const getStrengthColor = () => {
    switch (passwordStrength) {
      case "weak": return "bg-red-500";
      case "medium": return "bg-yellow-500";
      case "strong": return "bg-green-500";
      default: return "bg-gray-200";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!password.trim() || !confirmPassword.trim()) {
      toast({
        title: "Error",
        description: "All fields are required",
        variant: "destructive",
      });
      return;
    }

    if (password !== confirmPassword) {
      toast({
        title: "Error",
        description: "Passwords do not match",
        variant: "destructive",
      });
      return;
    }

    if (password.length < 6) {
      toast({
        title: "Error",
        description: "Password must be at least 6 characters",
        variant: "destructive",
      });
      return;
    }

    await onUpdatePassword(password);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-2">
        <Label htmlFor="new-password">New Password</Label>
        <Input
          id="new-password"
          type="password"
          value={password}
          onChange={handlePasswordChange}
          placeholder="Enter new password"
          required
        />
        {password && (
          <div className="mt-1 space-y-1">
            <div className="flex items-center">
              <div className="h-2 flex-1 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className={`h-full ${getStrengthColor()} transition-all duration-300`} 
                  style={{ width: passwordStrength ? `${(passwordStrength === "weak" ? 33 : passwordStrength === "medium" ? 66 : 100)}%` : "0%" }} 
                />
              </div>
              <span className={`ml-2 text-sm ${
                passwordStrength === "weak" ? "text-red-500" : 
                passwordStrength === "medium" ? "text-yellow-500" : 
                passwordStrength === "strong" ? "text-green-500" : ""
              }`}>
                {passwordStrength ? passwordStrength.charAt(0).toUpperCase() + passwordStrength.slice(1) : ""}
              </span>
            </div>
            
            {passwordStrength === "weak" && (
              <div className="flex items-center text-sm text-red-500 mt-1">
                <AlertCircle className="h-4 w-4 mr-1" />
                <span>Use at least 8 characters with letters, numbers & symbols</span>
              </div>
            )}
          </div>
        )}
      </div>
      <div className="grid gap-2">
        <Label htmlFor="confirm-password">Confirm Password</Label>
        <Input
          id="confirm-password"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="Confirm new password"
          required
        />
        {password && confirmPassword && password !== confirmPassword && (
          <p className="text-sm text-red-500 mt-1">Passwords do not match</p>
        )}
      </div>
      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? "Updating..." : "Update Password"}
      </Button>
    </form>
  );
};
