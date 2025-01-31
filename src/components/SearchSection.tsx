import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export const SearchSection = () => {
  return (
    <div className="max-w-4xl mx-auto px-4 -mt-8">
      <div className="bg-white/80 backdrop-blur-lg rounded-lg shadow-lg p-6 space-y-4">
        <Input
          type="text"
          placeholder="Search for airline pet policies..."
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
  );
};