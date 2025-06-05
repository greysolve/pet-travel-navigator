
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

interface SignUpFormProps {
  onSignUp: (email: string, password: string, firstName: string, lastName: string) => Promise<void>;
  isLoading: boolean;
  onToggleMode: () => void;
}

export const SignUpForm = ({ onSignUp, isLoading, onToggleMode }: SignUpFormProps) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [passwordStrength, setPasswordStrength] = useState<{
    score: number;
    message: string;
    isStrong: boolean;
  }>({ score: 0, message: "", isStrong: false });

  const checkPasswordStrength = (password: string) => {
    let score = 0;
    let message = "";
    let isStrong = false;

    if (password.length === 0) {
      return { score, message, isStrong };
    }

    // Check length
    if (password.length < 6) {
      message = "Password is too short";
      return { score, message, isStrong };
    } else if (password.length >= 12) {
      score += 2;
    } else if (password.length >= 8) {
      score += 1;
    }

    // Check for mixed case
    if (password.match(/[a-z]/) && password.match(/[A-Z]/)) {
      score += 1;
    }

    // Check for numbers
    if (password.match(/\d/)) {
      score += 1;
    }

    // Check for special characters
    if (password.match(/[^a-zA-Z\d]/)) {
      score += 1;
    }

    // Determine message and strength based on score
    if (score < 2) {
      message = "Weak password";
    } else if (score < 4) {
      message = "Moderate password";
      isStrong = true;
    } else {
      message = "Strong password";
      isStrong = true;
    }

    return { score, message, isStrong };
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newPassword = e.target.value;
    setPassword(newPassword);
    setPasswordStrength(checkPasswordStrength(newPassword));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim() || !firstName.trim() || !lastName.trim()) {
      toast({
        title: "Error",
        description: "All fields are required",
        variant: "destructive",
      });
      return;
    }

    if (password.length < 8) {
      toast({
        title: "Error",
        description: "Password must be at least 8 characters long",
        variant: "destructive",
      });
      return;
    }

    if (!passwordStrength.isStrong) {
      toast({
        title: "Weak Password",
        description: "Please create a stronger password with a mix of letters, numbers, and symbols",
        variant: "destructive",
      });
      return;
    }

    await onSignUp(email, password, firstName, lastName);
  };

  const getPasswordColor = () => {
    if (password.length === 0) return "";
    if (passwordStrength.score < 2) return "text-red-500";
    if (passwordStrength.score < 4) return "text-yellow-500";
    return "text-green-500";
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-2">
        <Label htmlFor="firstName">First Name</Label>
        <Input
          id="firstName"
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          placeholder="Enter your first name"
          required
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="lastName">Last Name</Label>
        <Input
          id="lastName"
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
          placeholder="Enter your last name"
          required
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Enter your email"
          required
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          value={password}
          onChange={handlePasswordChange}
          placeholder="Choose a password (min. 8 characters)"
          required
          minLength={8}
        />
        {password.length > 0 && (
          <div className={`text-sm mt-1 ${getPasswordColor()}`}>
            {passwordStrength.message}
          </div>
        )}
        <div className="text-xs text-muted-foreground">
          Use at least 8 characters with a mix of letters, numbers, and symbols.
        </div>
      </div>
      
      <Alert variant="info" className="bg-blue-500/10 text-blue-700 border-blue-500/50">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          We check passwords against known data breaches for your security.
        </AlertDescription>
      </Alert>
      
      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? "Signing up..." : "Sign Up"}
      </Button>
      <div className="text-center text-sm">
        <button
          type="button"
          onClick={onToggleMode}
          className="text-blue-500 hover:underline"
        >
          Already have an account? Sign In
        </button>
      </div>
    </form>
  );
};
