import { useState, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { CalendarIcon, Check, ChevronsUpDown, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Airport = {
  iata_code: string;
  name: string;
  city: string;
};

export const SearchSection = () => {
  const [policySearch, setPolicySearch] = useState("");
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [date, setDate] = useState<Date>();
  const [isLoading, setIsLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [airports, setAirports] = useState<Airport[]>([]);
  const [openOrigin, setOpenOrigin] = useState(false);
  const [openDestination, setOpenDestination] = useState(false);
  const { toast } = useToast();

  const fetchAirports = useCallback(async (searchTerm: string) => {
    if (!searchTerm || searchTerm.length < 2) {
      setAirports([]);
      return;
    }
    
    setIsSearching(true);
    try {
      const { data, error } = await supabase
        .from('airports')
        .select('iata_code, name, city')
        .or(`iata_code.ilike.%${searchTerm}%,city.ilike.%${searchTerm}%`)
        .limit(10);

      if (error) {
        console.error('Error fetching airports:', error);
        toast({
          title: "Error fetching airports",
          description: "Please try again",
          variant: "destructive",
        });
        return;
      }

      setAirports(data || []);
    } catch (error) {
      console.error('Error fetching airports:', error);
      toast({
        title: "Error fetching airports",
        description: "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsSearching(false);
    }
  }, [toast]);

  const handleSearch = async () => {
    if (policySearch && (origin || destination)) {
      toast({
        title: "Please choose one search method",
        description: "You can either search by airline policy or by route, but not both at the same time.",
        variant: "destructive",
      });
      return;
    }

    if (origin && destination && !date) {
      toast({
        title: "Please select a date",
        description: "A departure date is required to search for flights.",
        variant: "destructive",
      });
      return;
    }
    
    if (origin && destination && date) {
      setIsLoading(true);
      try {
        const { data, error } = await supabase.functions.invoke('search_flight_schedules', {
          body: { origin, destination, date: date.toISOString() }
        });

        if (error) throw error;

        console.log('Flight schedules:', data);
        // Here you would handle the response data, perhaps passing it to a parent component
        // or updating some state to display the results

      } catch (error) {
        console.error('Error searching flights:', error);
        toast({
          title: "Error searching flights",
          description: "There was an error searching for flights. Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    }
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
          <Popover open={openOrigin} onOpenChange={setOpenOrigin}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={openOrigin}
                className="h-12 text-base bg-white/90 border-0 shadow-sm justify-between"
              >
                {origin
                  ? airports.find((airport) => airport.iata_code === origin)?.city || origin
                  : "Origin (city or airport code)"}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-full p-0">
              <Command>
                <CommandInput 
                  placeholder="Search airports..." 
                  onValueChange={(value) => {
                    console.log('Search value:', value);
                    fetchAirports(value);
                  }}
                />
                <CommandEmpty>No airports found.</CommandEmpty>
                {isSearching ? (
                  <div className="flex items-center justify-center py-6">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                ) : (
                  <CommandGroup>
                    {airports.map((airport) => (
                      <CommandItem
                        key={airport.iata_code}
                        value={airport.iata_code}
                        onSelect={(value) => {
                          setOrigin(value);
                          setOpenOrigin(false);
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            origin === airport.iata_code ? "opacity-100" : "opacity-0"
                          )}
                        />
                        {airport.city} ({airport.iata_code})
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}
              </Command>
            </PopoverContent>
          </Popover>

          <Popover open={openDestination} onOpenChange={setOpenDestination}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={openDestination}
                className="h-12 text-base bg-white/90 border-0 shadow-sm justify-between"
              >
                {destination
                  ? airports.find((airport) => airport.iata_code === destination)?.city || destination
                  : "Destination (city or airport code)"}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-full p-0">
              <Command>
                <CommandInput 
                  placeholder="Search airports..." 
                  onValueChange={(value) => {
                    console.log('Search value:', value);
                    fetchAirports(value);
                  }}
                />
                <CommandEmpty>No airports found.</CommandEmpty>
                {isSearching ? (
                  <div className="flex items-center justify-center py-6">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                ) : (
                  <CommandGroup>
                    {airports.map((airport) => (
                      <CommandItem
                        key={airport.iata_code}
                        value={airport.iata_code}
                        onSelect={(value) => {
                          setDestination(value);
                          setOpenDestination(false);
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            destination === airport.iata_code ? "opacity-100" : "opacity-0"
                          )}
                        />
                        {airport.city} ({airport.iata_code})
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}
              </Command>
            </PopoverContent>
          </Popover>
        </div>

        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-full h-12 text-base bg-white/90 border-0 shadow-sm justify-start text-left font-normal",
                !date && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {date ? format(date, "PPP") : <span>Pick a departure date</span>}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={date}
              onSelect={setDate}
              initialFocus
              disabled={(date) => date < new Date()}
            />
          </PopoverContent>
        </Popover>

        <Button 
          className="w-full h-12 mt-4 text-base bg-secondary hover:bg-secondary/90"
          onClick={handleSearch}
          disabled={isLoading}
        >
          {isLoading ? "Searching..." : "Search"}
        </Button>
      </div>
    </div>
  );
};