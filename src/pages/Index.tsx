import { useState } from "react";
import { PawPrint } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "@/components/ui/use-toast";

const mockFlights = [
  {
    airline: "PawAir",
    flightNumber: "PA123",
    departureTime: "09:00 AM",
    arrivalTime: "11:30 AM",
    petPolicy: "Cats and small dogs allowed in cabin. Carriers must fit under seat.",
  },
  {
    airline: "FurryFlights",
    flightNumber: "FF456",
    departureTime: "02:15 PM",
    arrivalTime: "04:45 PM",
    petPolicy: "All pets must travel in cargo hold. Health certificate required.",
  },
];

const Index = () => {
  const [searchPerformed, setSearchPerformed] = useState(false);
  const [isSignUpMode, setIsSignUpMode] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { signInWithEmail, signUp } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearch = (origin: string, destination: string) => {
    console.log("Searching flights from", origin, "to", destination);
    setSearchPerformed(true);
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
    <div className="min-h-screen bg-[#F1F0FB]">
      {/* Hero section with primary background */}
      <div className="bg-primary py-16">
        <div className="flex flex-col items-center justify-center px-4">
          <div className="w-full max-w-[600px] text-center space-y-8">
            <div className="flex items-center justify-center gap-4 text-primary-foreground">
              <PawPrint className="h-16 w-16" />
              <h1 className="text-6xl font-bold">PawPort</h1>
            </div>
            
            <p className="text-2xl text-primary-foreground/90">
              Find pet-friendly flights for your furry travel companion
            </p>

            <div className="flex items-center justify-center mt-8">
              <Dialog>
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
            </div>
          </div>
        </div>
      </div>

      {/* Search section with glass effect */}
      <div className="max-w-4xl mx-auto px-4 -mt-8">
        <div className="bg-white/80 backdrop-blur-lg rounded-lg shadow-lg p-6 space-y-4">
          <Input
            type="text"
            placeholder="Search for airline pet policies..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-12 text-lg bg-white/90 border-0 shadow-sm"
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              type="text"
              placeholder="Origin (city or airport code)"
              className="h-12 text-base bg-white/90 border-0 shadow-sm"
            />
            <Input
              type="text"
              placeholder="Destination (city or airport code)"
              className="h-12 text-base bg-white/90 border-0 shadow-sm"
            />
          </div>
          <Button 
            className="w-full h-12 mt-4 text-base bg-secondary hover:bg-secondary/90"
          >
            Search
          </Button>
        </div>
      </div>

      {/* Results section */}
      {searchPerformed && (
        <div className="container mx-auto px-4 py-12">
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {mockFlights.map((flight, index) => (
                <FlightCard key={index} {...flight} />
              ))}
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h2 className="text-xl font-semibold mb-4">Destination Pet Policy</h2>
              <p className="text-gray-700">
                Pets entering this destination must have:
                <ul className="list-disc list-inside mt-2 space-y-2">
                  <li>Valid pet passport</li>
                  <li>Up-to-date vaccinations</li>
                  <li>Microchip identification</li>
                  <li>Health certificate issued within 10 days of travel</li>
                </ul>
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Index;
