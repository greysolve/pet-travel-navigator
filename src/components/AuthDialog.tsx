import { useState } from "react";
import { PawPrint, User } from "lucide-react";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export const AuthDialog = () => {
  const [isSignUpMode, setIsSignUpMode] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { signInWithEmail, signUp, signOut, user, profile } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  // Extract first name from full name
  const getFirstName = () => {
    if (profile?.full_name) {
      return profile.full_name.split(' ')[0];
    }
    return user?.email?.split('@')[0] || 'Profile';
  };

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
        
        setIsOpen(false);
        
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

  if (user) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="relative h-12 flex items-center gap-2">
            <Avatar className="h-8 w-8">
              <AvatarImage src={profile?.avatar_url} />
              <AvatarFallback>
                <User className="h-4 w-4" />
              </AvatarFallback>
            </Avatar>
            <span>{getFirstName()}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuItem onClick={() => navigate('/profile')}>
            Profile
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => navigate('/settings')}>
            Settings
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => navigate('/pets')}>
            Pets
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem 
            onClick={() => {
              signOut();
              navigate('/');
            }}
            className="text-red-600"
          >
            Sign Out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

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