import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Plane } from "lucide-react";

export const SearchForm = ({ onSearch }: { onSearch: (origin: string, destination: string) => void }) => {
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(origin, destination);
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-3xl space-y-4">
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1">
          <Input
            placeholder="Origin (city or airport code)"
            value={origin}
            onChange={(e) => setOrigin(e.target.value)}
            className="h-12"
          />
        </div>
        <div className="flex-1">
          <Input
            placeholder="Destination (city or airport code)"
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            className="h-12"
          />
        </div>
        <Button type="submit" className="h-12 px-8" disabled={!origin || !destination}>
          <Search className="mr-2 h-4 w-4" />
          Search
        </Button>
      </div>
    </form>
  );
};