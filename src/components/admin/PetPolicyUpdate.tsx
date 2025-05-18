
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const PetPolicyUpdate = () => {
  const [selectedAirline, setSelectedAirline] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [jsonInput, setJsonInput] = useState("");
  const [showAirlineSuggestions, setShowAirlineSuggestions] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  // Add state for showing parsed JSON preview
  const [parsedJson, setParsedJson] = useState<any>(null);
  const [parseError, setParseError] = useState<string | null>(null);

  const { data: airlines, isLoading } = useQuery({
    queryKey: ["airlines", searchTerm],
    queryFn: async () => {
      if (!searchTerm || searchTerm.length < 2) return [];
      
      console.log('Fetching airlines for search term:', searchTerm);
      const { data, error } = await supabase
        .from('airlines')
        .select('id, name, iata_code')
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

  const handlePreview = () => {
    try {
      const parsed = JSON.parse(jsonInput);
      setParsedJson(parsed);
      setParseError(null);
      
      toast({
        title: "JSON parsed successfully",
        description: "Review the preview below",
      });
    } catch (error) {
      console.error("JSON parse error:", error);
      setParseError(error.message);
      setParsedJson(null);
      
      toast({
        title: "Invalid JSON",
        description: error.message,
        variant: "destructive",
      });
    }
  };

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
      setIsUploading(true);
      
      // Parse JSON
      const policyData = JSON.parse(jsonInput);

      // Call our new Edge Function to handle the upload
      const response = await fetch(`https://jhokkuszubzngrcamfdb.supabase.co/functions/v1/upload_pet_policy`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        },
        body: JSON.stringify({
          airlineId: selectedAirline.id,
          policyData
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || result.details || 'Unknown error occurred');
      }

      toast({
        title: "Success",
        description: `Pet policy for ${result.airline} (${result.airline_code}) updated successfully`,
      });
      
      // Clear form after successful update
      setParsedJson(null);
      
    } catch (error) {
      console.error("Error updating pet policy:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update pet policy",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
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
                        setSearchTerm(`${airline.name} (${airline.iata_code})`);
                        setShowAirlineSuggestions(false);
                      }}
                    >
                      {airline.name} ({airline.iata_code})
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
        <div className="flex gap-2 mb-2">
          <Button 
            variant="outline" 
            onClick={handlePreview} 
            type="button"
          >
            Validate JSON
          </Button>
        </div>
        <Textarea
          value={jsonInput}
          onChange={(e) => setJsonInput(e.target.value)}
          placeholder={`Paste the pet policy JSON here in the format:
{
  "airline_info": {
    "official_website": "https://www.airline.com",
    "pet_policy_url": "https://www.airline.com/pet-policy"
  },
  "pet_policy": {
    "allowed_pets": ["Dogs", "Cats"],
    "size_weight_restrictions": { ... },
    "carrier_requirements": { ... },
    "documentation_needed": [ ... ],
    "fees": { ... },
    "temperature_breed_restrictions": { ... }
  }
}`}
          className="min-h-[300px] font-mono"
        />
        {parseError && (
          <p className="text-destructive text-sm">{parseError}</p>
        )}
      </div>

      {parsedJson && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="pt-4">
            <h3 className="font-medium mb-2">JSON Preview</h3>
            <div className="overflow-auto max-h-[300px] rounded bg-white p-4 border">
              <pre className="text-xs">{JSON.stringify(parsedJson, null, 2)}</pre>
            </div>
          </CardContent>
        </Card>
      )}

      <Button 
        onClick={handleUpdate} 
        className="w-full"
        disabled={isUploading || !selectedAirline}
      >
        {isUploading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Updating Pet Policy...
          </>
        ) : (
          'Update Pet Policy'
        )}
      </Button>
      
      <div className="bg-amber-50 p-4 rounded-md border border-amber-200">
        <h4 className="font-medium text-amber-800">JSON Format Requirements</h4>
        <p className="text-sm text-amber-700 mt-1">
          Make sure your JSON follows this exact structure:
        </p>
        <pre className="bg-white p-2 rounded mt-2 text-xs overflow-x-auto">
{`{
  "airline_info": {
    "official_website": "https://www.airline.com",
    "pet_policy_url": "https://www.airline.com/pet-policy"
  },
  "pet_policy": {
    "allowed_pets": ["Dogs", "Cats"],
    "size_weight_restrictions": {
      "cabin_max_weight_kg": 9.07,
      "cabin_weight_includes_carrier": true,
      "cabin_height_cm": 30.48,
      "cabin_width_cm": 21.59,
      "cabin_length_cm": 43.18,
      "cabin_linear_dimensions_cm": 95.25,
      "cabin_combined_weight_kg": 9.07,
      "cargo_max_weight_kg": null,
      "cargo_weight_includes_carrier": null,
      "cargo_height_cm": null,
      "cargo_width_cm": null,
      "cargo_length_cm": null,
      "cargo_linear_dimensions_cm": null,
      "cargo_combined_weight_kg": null
    },
    "carrier_requirements": {
      "in_cabin": "Requirements for cabin travel",
      "cargo": "Requirements for cargo travel or null"
    },
    "documentation_needed": [
      "Document 1",
      "Document 2"
    ],
    "fees": {
      "in_cabin": "Fee description",
      "cargo": "Fee description or null"
    },
    "temperature_breed_restrictions": {
      "temperature": "Temperature restrictions or null",
      "breed": ["Restricted breed 1", "Restricted breed 2"]
    }
  }
}`}
        </pre>
      </div>
    </div>
  );
};

export default PetPolicyUpdate;
