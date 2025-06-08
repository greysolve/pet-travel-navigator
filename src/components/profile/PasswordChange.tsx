
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export const PasswordChange = () => {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState<{
    score: number;
    message: string;
    isStrong: boolean;
  }>({ score: 0, message: "", isStrong: false });
  const { toast } = useToast();

  const checkPasswordStrength = (password: string) => {
    let score = 0;
    let message = "";
    let isStrong = false;

    if (password.length === 0) {
      return { score, message, isStrong };
    }

    // Check length
    if (password.length < 8) {
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

  const handlePasswordChange = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPassword !== confirmPassword) {
      toast({
        title: "Error",
        description: "New passwords do not match",
        variant: "destructive",
      });
      return;
    }

    if (newPassword.length < 8) {
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

    setIsUpdating(true);
    updatePassword();
  };

  const updatePassword = async () => {
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) {
        // Handle specific error for leaked passwords
        if (error.message && error.message.includes("been leaked")) {
          toast({
            title: "Password Security Issue",
            description: "This password has appeared in a data breach and cannot be used. Please choose a different, secure password.",
            variant: "destructive",
          });
        } else {
          throw error;
        }
      } else {
        toast({
          title: "Success",
          description: "Password updated successfully",
        });

        // Clear form
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        setPasswordStrength({ score: 0, message: "", isStrong: false });
      }
    } catch (error: any) {
      console.error("Error updating password:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to update password",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleNewPasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const password = e.target.value;
    setNewPassword(password);
    setPasswordStrength(checkPasswordStrength(password));
  };

  const getPasswordColor = () => {
    if (newPassword.length === 0) return "";
    if (passwordStrength.score < 2) return "text-red-500";
    if (passwordStrength.score < 4) return "text-yellow-500";
    return "text-green-500";
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Change Password</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handlePasswordChange} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="currentPassword">Current Password</Label>
            <Input
              id="currentPassword"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="newPassword">New Password</Label>
            <Input
              id="newPassword"
              type="password"
              value={newPassword}
              onChange={handleNewPasswordChange}
              required
              minLength={8}
            />
            {newPassword.length > 0 && (
              <div className={`text-sm mt-1 ${getPasswordColor()}`}>
                {passwordStrength.message}
              </div>
            )}
            <div className="text-xs text-muted-foreground">
              Use at least 8 characters with a mix of letters, numbers, and symbols.
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm New Password</Label>
            <Input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={8}
            />
          </div>

          <Alert variant="info" className="bg-blue-500/10 text-blue-700 border-blue-500/50">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              We check passwords against known data breaches for your security.
            </AlertDescription>
          </Alert>

          <Button 
            type="submit" 
            disabled={isUpdating}
            className="w-full"
          >
            {isUpdating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Updating...
              </>
            ) : (
              'Update Password'
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};
