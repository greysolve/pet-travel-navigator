import { useState } from "react";
import { PawPrint } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "@/components/ui/use-toast";

export const AuthDialog = () => {
  const [isSignUpMode, setIsSignUpMode] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { signInWithEmail, signUp, user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      if (isSignUpMode) {
        await signUp(email, password);
        toast({
          title: "Account created successfully!",
          description: "Please check your email to verify your account.",
        });
      } else {
        await signInWithEmail(email, password);
        toast({
          title: "Welcome back!",
          description: "Successfully signed in",
        });
        
        setIsOpen(false); // Close the dialog after successful sign in
        
        // Check if user is a site manager and redirect to admin
        if (user?.user_metadata?.role === 'site_manager') {
          console.log("Site manager logged in, redirecting to admin");
          navigate('/admin');
        } else {
          console.log("Regular user logged in, redirecting to profile");
          navigate('/profile');
        }
      }
    } catch (error: any) {
      console.error("Authentication error:", error);
      toast({
        variant: "destructive",
        title: "Authentication Error",
        description: error.message || "Please check your credentials and try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="secondary"
          className="h-12 px-6 text-base font-medium bg-secondary/90 hover:bg-secondary"
          disabled={isLoading}
        >
          Sign In
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[400px] p-0">
        <div className="flex flex-col items-center space-y-6 p-8">
          <PawPrint className="h-12 w-12 text-primary" />
          <DialogTitle className="text-2xl font-normal text-center">
            {isSignUpMode ? "Create your account" : "Welcome back"}
          </DialogTitle>
          <p className="text-sm text-muted-foreground text-center max-w-[280px]">
            {isSignUpMode
              ? "Join PawPort to find pet-friendly flights"
              : "Sign in to continue your journey"}
          </p>
          <form onSubmit={handleAuthSubmit} className="w-full space-y-4">
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@company.com"
              className="w-full h-12 text-base bg-white border-gray-300"
              required
              disabled={isLoading}
            />
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="w-full h-12 text-base bg-white border-gray-300"
              required
              disabled={isLoading}
            />
            <Button 
              type="submit" 
              className="w-full h-12 text-base bg-[#1A1F2C] hover:bg-[#2A2F3C] mt-4"
              disabled={isLoading}
            >
              {isLoading 
                ? "Processing..." 
                : (isSignUpMode ? "Sign up with email" : "Sign in with email")}
            </Button>
            <div className="text-center space-y-4 mt-6">
              <p className="text-sm text-muted-foreground">
                {isSignUpMode ? "Already have an account?" : "Don't have an account?"}{" "}
                <button
                  type="button"
                  onClick={() => setIsSignUpMode(!isSignUpMode)}
                  className="text-primary hover:underline font-medium"
                  disabled={isLoading}
                >
                  {isSignUpMode ? "Sign in" : "Sign up"}
                </button>
              </p>
              {isSignUpMode && (
                <p className="text-xs text-muted-foreground max-w-[280px] mx-auto">
                  By signing up, you agree to our Terms of Service and Privacy Policy
                </p>
              )}
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
};