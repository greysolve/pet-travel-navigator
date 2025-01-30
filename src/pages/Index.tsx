import { useState } from "react";
import { SearchForm } from "@/components/SearchForm";
import { FlightCard } from "@/components/FlightCard";
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

// Mock data for demonstration
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
  const { signIn, signInWithEmail, signUp } = useAuth();

  const handleSearch = (origin: string, destination: string) => {
    console.log("Searching flights from", origin, "to", destination);
    setSearchPerformed(true);
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (isSignUpMode) {
        await signUp(email, password);
        toast({
          title: "Account created successfully!",
          description: "Welcome to PawPort",
        });
      } else {
        await signInWithEmail(email, password);
        toast({
          title: "Welcome back!",
          description: "Successfully signed in",
        });
      }
    } catch (error) {
      console.error("Authentication error:", error);
      toast({
        variant: "destructive",
        title: "Authentication Error",
        description: "Please check your credentials and try again.",
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-accent to-background">
      <div className="bg-primary text-primary-foreground py-16">
        <div className="container mx-auto px-4">
          <div className="flex flex-col items-center justify-center gap-6 text-center">
            <div className="flex items-center justify-center gap-2">
              <PawPrint className="h-16 w-16" />
              <h1 className="text-5xl font-bold">PawPort</h1>
            </div>
            <p className="text-2xl max-w-2xl mx-auto">
              Find pet-friendly flights for your furry travel companion
            </p>
            <div className="flex gap-4">
              <Button onClick={signIn} variant="secondary">
                Continue with Google
              </Button>
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="secondary">Email Sign In</Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[400px] p-0">
                  <div className="flex flex-col items-center space-y-4 p-8">
                    <PawPrint className="h-12 w-12 text-primary" />
                    <DialogTitle className="text-2xl font-normal text-center">
                      {isSignUpMode ? "Create your account" : "Welcome back"}
                    </DialogTitle>
                    <p className="text-sm text-muted-foreground text-center max-w-[280px]">
                      {isSignUpMode
                        ? "Join PawPort to find pet-friendly flights"
                        : "Sign in to continue your journey"}
                    </p>
                    <form onSubmit={handleAuthSubmit} className="w-full space-y-4 mt-4">
                      <Input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="name@company.com"
                        className="w-full h-12 text-base"
                        required
                      />
                      <Input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Password"
                        className="w-full h-12 text-base"
                        required
                      />
                      <Button 
                        type="submit" 
                        className="w-full h-12 text-base bg-[#1A1F2C] hover:bg-[#2A2F3C] mt-2"
                      >
                        {isSignUpMode ? "Sign up with email" : "Sign in with email"}
                      </Button>
                      <div className="text-center space-y-4 mt-6">
                        <p className="text-sm text-muted-foreground">
                          {isSignUpMode ? "Already have an account?" : "Don't have an account?"}{" "}
                          <button
                            type="button"
                            onClick={() => setIsSignUpMode(!isSignUpMode)}
                            className="text-primary hover:underline font-medium"
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
            <div className="w-full max-w-3xl mt-4">
              <SearchForm onSearch={handleSearch} />
            </div>
          </div>
        </div>
      </div>

      {/* Results Section */}
      <div className="container mx-auto px-4 py-12">
        {searchPerformed && (
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
        )}
      </div>
    </div>
  );
};

export default Index;