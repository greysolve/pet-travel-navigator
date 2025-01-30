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
      } else {
        await signInWithEmail(email, password);
      }
    } catch (error) {
      console.error("Authentication error:", error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-accent to-background">
      {/* Hero Section */}
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
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>
                      {isSignUpMode ? "Create an Account" : "Sign In"}
                    </DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleAuthSubmit} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Email
                      </label>
                      <Input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Password
                      </label>
                      <Input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <Button type="submit">
                        {isSignUpMode ? "Sign Up" : "Sign In"}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => setIsSignUpMode(!isSignUpMode)}
                      >
                        {isSignUpMode
                          ? "Already have an account? Sign In"
                          : "Need an account? Sign Up"}
                      </Button>
                    </div>
                  </form>
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