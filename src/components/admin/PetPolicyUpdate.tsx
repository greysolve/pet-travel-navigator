import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { toast } from "@/hooks/use-toast";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

const PetPolicyUpdate = () => {
  const [open, setOpen] = useState(false);
  const [selectedAirline, setSelectedAirline] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [jsonInput, setJsonInput] = useState("");

  const { data: airlines, isLoading } = useQuery({
    queryKey: ["airlines"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("airlines")
        .select("id, name")
        .order("name");

      if (error) {
        toast({
          title: "Error fetching airlines",
          description: error.message,
          variant: "destructive",
        });
        throw error;
      }
      return data || [];
    },
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
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className="justify-between"
              disabled={isLoading}
            >
              {isLoading ? (
                "Loading airlines..."
              ) : (
                selectedAirline ? selectedAirline.name : "Select airline..."
              )}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[400px] p-0">
            <Command>
              <CommandInput placeholder="Search airlines..." />
              <CommandEmpty>No airline found.</CommandEmpty>
              <CommandGroup className="max-h-[300px] overflow-y-auto">
                {(airlines || []).map((airline) => (
                  <CommandItem
                    key={airline.id}
                    onSelect={() => {
                      setSelectedAirline(airline);
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        selectedAirline?.id === airline.id
                          ? "opacity-100"
                          : "opacity-0"
                      )}
                    />
                    {airline.name}
                  </CommandItem>
                ))}
              </CommandGroup>
            </Command>
          </PopoverContent>
        </Popover>
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