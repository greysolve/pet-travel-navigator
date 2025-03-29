
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/use-toast";
import { AlertCircle, Check, Eye, EyeOff } from "lucide-react";

interface UpdatePasswordFormProps {
  onUpdatePassword: (password: string) => Promise<void>;
  isLoading: boolean;
}

export const UpdatePasswordForm = ({ onUpdatePassword, isLoading }: UpdatePasswordFormProps) => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordStrength, setPasswordStrength] = useState<"weak" | "medium" | "strong" | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isValid, setIsValid] = useState(false);
  
  const validations = {
    minLength: password.length >= 8,
    hasUpperCase: /[A-Z]/.test(password),
    hasLowerCase: /[a-z]/.test(password),
    hasNumber: /\d/.test(password),
    hasSpecialChar: /[^A-Za-z0-9]/.test(password),
    passwordsMatch: password === confirmPassword && password !== ""
  };

  useEffect(() => {
    // Update overall validity
    setIsValid(
      validations.minLength &&
      validations.hasUpperCase &&
      validations.hasLowerCase && 
      validations.hasNumber &&
      validations.passwordsMatch
    );
    
    // Calculate strength
    const score = [
      validations.minLength,
      validations.hasUpperCase,
      validations.hasLowerCase,
      validations.hasNumber,
      validations.hasSpecialChar
    ].filter(Boolean).length;
    
    if (score <= 2) setPasswordStrength("weak");
    else if (score <= 4) setPasswordStrength("medium");
    else setPasswordStrength("strong");
    
  }, [password, confirmPassword]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isValid) {
      toast({
        title: "Password requirements not met",
        description: "Please make sure your password meets all the requirements.",
        variant: "destructive",
      });
      return;
    }

    await onUpdatePassword(password);
  };

  const getStrengthColor = () => {
    switch (passwordStrength) {
      case "weak": return "bg-red-500";
      case "medium": return "bg-yellow-500";
      case "strong": return "bg-green-500";
      default: return "bg-gray-200";
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid gap-2">
        <Label htmlFor="new-password">New Password</Label>
        <div className="relative">
          <Input
            id="new-password"
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter new password"
            required
            className="pr-10"
          />
          <button 
            type="button"
            onClick={() => setShowPassword(!showPassword)} 
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500"
            tabIndex={-1}
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
        
        {password && (
          <div className="mt-1 space-y-3">
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
            
            <div className="space-y-2 text-sm">
              <p className="font-medium text-gray-700">Password requirements:</p>
              <ul className="space-y-1">
                <li className="flex items-center">
                  {validations.minLength ? 
                    <Check className="h-4 w-4 mr-2 text-green-500" /> : 
                    <AlertCircle className="h-4 w-4 mr-2 text-red-500" />
                  }
                  <span className={validations.minLength ? "text-green-700" : "text-red-700"}>
                    At least 8 characters
                  </span>
                </li>
                <li className="flex items-center">
                  {validations.hasUpperCase ? 
                    <Check className="h-4 w-4 mr-2 text-green-500" /> : 
                    <AlertCircle className="h-4 w-4 mr-2 text-red-500" />
                  }
                  <span className={validations.hasUpperCase ? "text-green-700" : "text-red-700"}>
                    At least one uppercase letter
                  </span>
                </li>
                <li className="flex items-center">
                  {validations.hasLowerCase ? 
                    <Check className="h-4 w-4 mr-2 text-green-500" /> : 
                    <AlertCircle className="h-4 w-4 mr-2 text-red-500" />
                  }
                  <span className={validations.hasLowerCase ? "text-green-700" : "text-red-700"}>
                    At least one lowercase letter
                  </span>
                </li>
                <li className="flex items-center">
                  {validations.hasNumber ? 
                    <Check className="h-4 w-4 mr-2 text-green-500" /> : 
                    <AlertCircle className="h-4 w-4 mr-2 text-red-500" />
                  }
                  <span className={validations.hasNumber ? "text-green-700" : "text-red-700"}>
                    At least one number
                  </span>
                </li>
                <li className="flex items-center">
                  {validations.hasSpecialChar ? 
                    <Check className="h-4 w-4 mr-2 text-green-500" /> : 
                    <AlertCircle className="h-4 w-4 mr-2 text-text-500" />
                  }
                  <span className={validations.hasSpecialChar ? "text-green-700" : "text-gray-700"}>
                    Special character (recommended)
                  </span>
                </li>
              </ul>
            </div>
          </div>
        )}
      </div>
      
      <div className="grid gap-2">
        <Label htmlFor="confirm-password">Confirm Password</Label>
        <div className="relative">
          <Input
            id="confirm-password"
            type={showConfirmPassword ? "text" : "password"}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirm new password"
            required
            className="pr-10"
          />
          <button 
            type="button"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)} 
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500"
            tabIndex={-1}
          >
            {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
        {confirmPassword && !validations.passwordsMatch && (
          <p className="text-sm text-red-500 mt-1 flex items-center">
            <AlertCircle className="h-4 w-4 mr-1" />
            Passwords do not match
          </p>
        )}
      </div>
      
      <Button 
        type="submit" 
        className="w-full" 
        disabled={isLoading || !isValid}
      >
        {isLoading ? "Updating..." : "Update Password"}
      </Button>
    </form>
  );
};
