import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

const PetPolicyUpdate = () => {
  const [selectedAirline, setSelectedAirline] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [jsonInput, setJsonInput] = useState("");
  const [showAirlineSuggestions, setShowAirlineSuggestions] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const { data: airlines, isLoading } = useQuery({
    queryKey: ["airlines", searchTerm],
    queryFn: async () => {
      if (!searchTerm || searchTerm.length < 2) return [];
      
      console.log('Fetching airlines for search term:', searchTerm);
      const { data, error } = await supabase
        .from('airlines')
        .select('id, name')
        .or(`name.ilike.%${searchTerm}%,iata_code.ilike.%${searchTerm}%`)
        .limit(10);

      if (error) {
        console.error('Error fetching airlines:', error);
        toast({
          title: "Error fetching airlines",
          description: "Please try again",
          variant: "destructive",
        });
        return [];
      }

      console.log('Fetched airlines:', data);
      return data || [];
    },
    enabled: searchTerm.length >= 2,
  });

  const handleUpdate = async () => {
    if (!selectedAirline) {
      toast({
        title: "Error",
        description: "Please select an airline first",
        variant: "destructive",
      });
      return;
    }

    try {
      // Parse and validate JSON
      const policyData = JSON.parse(jsonInput);
      
      // Extract policy details
      const petPolicy = {
        airline_id: selectedAirline.id,
        pet_types_allowed: policyData.pet_policy.pet_types_allowed,
        size_restrictions: policyData.pet_policy.size_restrictions,
        carrier_requirements: policyData.pet_policy.carrier_requirements,
        documentation_needed: policyData.pet_policy.documentation_needed,
        fees: policyData.pet_policy.fees,
        temperature_restrictions: policyData.pet_policy.temperature_restrictions,
        breed_restrictions: policyData.pet_policy.breed_restrictions,
        policy_url: policyData.airline_info?.official_website,
      };

      // Update airline website if provided
      if (policyData.airline_info?.official_website) {
        const { error: airlineError } = await supabase
          .from("airlines")
          .update({ website: policyData.airline_info.official_website })
          .eq("id", selectedAirline.id);

        if (airlineError) throw airlineError;
      }

      // Upsert pet policy
      const { error: policyError } = await supabase
        .from("pet_policies")
        .upsert(petPolicy, { onConflict: "airline_id" });

      if (policyError) throw policyError;

      toast({
        title: "Success",
        description: "Pet policy updated successfully",
      });
    } catch (error) {
      console.error("Error updating pet policy:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update pet policy",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-4 p-4">
      <h2 className="text-2xl font-bold mb-4">Update Pet Policy</h2>
      
      <div className="flex flex-col space-y-2">
        <label className="text-sm font-medium">Select Airline</label>
        <div className="relative">
          <Input
            type="text"
            placeholder="Search for an airline..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setShowAirlineSuggestions(true);
            }}
            onFocus={() => setShowAirlineSuggestions(true)}
            className="w-full"
          />
          
          {showAirlineSuggestions && (searchTerm.length >= 2) && (
            <div className="absolute z-10 w-full mt-1 bg-white rounded-md shadow-lg">
              {isLoading ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              ) : airlines && airlines.length > 0 ? (
                <ul className="max-h-60 overflow-auto py-1">
                  {airlines.map((airline) => (
                    <li
                      key={airline.id}
                      className="px-4 py-2 hover:bg-accent cursor-pointer"
                      onClick={() => {
                        setSelectedAirline(airline);
                        setSearchTerm(airline.name);
                        setShowAirlineSuggestions(false);
                      }}
                    >
                      {airline.name}
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  No airlines found
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col space-y-2">
        <label className="text-sm font-medium">Pet Policy JSON</label>
        <Textarea
          value={jsonInput}
          onChange={(e) => setJsonInput(e.target.value)}
          placeholder="Paste the pet policy JSON here..."
          className="min-h-[400px] font-mono"
        />
      </div>

      <Button onClick={handleUpdate} className="w-full">
        Update Pet Policy
      </Button>
    </div>
  );
};

export default PetPolicyUpdate;
