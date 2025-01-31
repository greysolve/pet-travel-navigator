import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";

export const SearchSection = () => {
  const [policySearch, setPolicySearch] = useState("");
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const { toast } = useToast();

  const handleSearch = () => {
    if (policySearch && (origin || destination)) {
      toast({
        title: "Please choose one search method",
        description: "You can either search by airline policy or by route, but not both at the same time.",
        variant: "destructive",
      });
      return;
    }
    
    // Proceed with search logic here
    console.log("Searching with:", { policySearch, origin, destination });
  };

  return (
    <div className="max-w-4xl mx-auto px-4 -mt-8">
      <div className="bg-white/80 backdrop-blur-lg rounded-lg shadow-lg p-6 space-y-4">
        <Input
          type="text"
          placeholder="Search for airline pet policies..."
          className="h-12 text-lg bg-white/90 border-0 shadow-sm"
          value={policySearch}
          onChange={(e) => setPolicySearch(e.target.value)}
        />
        
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white/80 px-2 text-muted-foreground">
              Or
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            type="text"
            placeholder="Origin (city or airport code)"
            className="h-12 text-base bg-white/90 border-0 shadow-sm"
            value={origin}
            onChange={(e) => setOrigin(e.target.value)}
          />
          <Input
            type="text"
            placeholder="Destination (city or airport code)"
            className="h-12 text-base bg-white/90 border-0 shadow-sm"
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
          />
        </div>
        <Button 
          className="w-full h-12 mt-4 text-base bg-secondary hover:bg-secondary/90"
          onClick={handleSearch}
        >
          Search
        </Button>
      </div>
    </div>
  );
};