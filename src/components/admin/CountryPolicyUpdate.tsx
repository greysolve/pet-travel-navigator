
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

const CountryPolicyUpdate = () => {
  const [selectedCountry, setSelectedCountry] = useState<{
    code: string;
    name: string;
  } | null>(null);
  const [jsonInput, setJsonInput] = useState("");
  const [showCountrySuggestions, setShowCountrySuggestions] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const { data: countries, isLoading } = useQuery({
    queryKey: ["countries", searchTerm],
    queryFn: async () => {
      if (!searchTerm || searchTerm.length < 2) return [];
      
      console.log('Fetching countries for search term:', searchTerm);
      const { data, error } = await supabase
        .from('countries')
        .select('code, name')
        .or(`name.ilike.%${searchTerm}%,code.ilike.%${searchTerm}%`)
        .limit(10);

      if (error) {
        console.error('Error fetching countries:', error);
        toast({
          title: "Error fetching countries",
          description: "Please try again",
          variant: "destructive",
        });
        return [];
      }

      return data || [];
    },
    enabled: searchTerm.length >= 2,
  });

  const findCaseInsensitiveKey = (obj: any, targetKey: string): string | null => {
    const lowerTargetKey = targetKey.toLowerCase();
    const matchingKey = Object.keys(obj).find(
      key => key.toLowerCase() === lowerTargetKey
    );
    return matchingKey || null;
  };

  const normalizePolicy = (policy: any) => {
    const normalized: any = {};
    const expectedFields = [
      'policy_type',
      'title',
      'description',
      'requirements',
      'documentation_needed',
      'fees',
      'restrictions',
      'quarantine_requirements',
      'vaccination_requirements',
      'additional_notes',
      'policy_url',
      'all_blood_tests',
      'all_other_biological_tests',
      'required_ports_of_entry'
    ];

    expectedFields.forEach(field => {
      const matchingKey = findCaseInsensitiveKey(policy, field);
      if (matchingKey !== null) {
        normalized[field] = policy[matchingKey];
      }
    });

    return normalized;
  };

  const handleUpdate = async () => {
    if (!selectedCountry) {
      toast({
        title: "Error",
        description: "Please select a country first",
        variant: "destructive",
      });
      return;
    }

    try {
      // Parse and validate JSON
      const policiesData = JSON.parse(jsonInput);
      
      if (!Array.isArray(policiesData)) {
        throw new Error("Input must be an array of policies");
      }

      console.log('Attempting to update policies for country:', selectedCountry.name);
      console.log('Original policies data:', policiesData);

      // Delete existing policies for this country using the country name
      const { error: deleteError } = await supabase
        .from("country_policies")
        .delete()
        .eq("country_code", selectedCountry.name);

      if (deleteError) {
        console.error('Error deleting existing policies:', deleteError);
        throw deleteError;
      }

      // Insert new policies with normalized fields, using country name
      for (const policy of policiesData) {
        const normalizedPolicy = normalizePolicy(policy);
        const policyData = {
          country_code: selectedCountry.name, // Using country name instead of code
          ...normalizedPolicy
        };

        console.log('Inserting normalized policy:', policyData);

        const { error: insertError } = await supabase
          .from("country_policies")
          .insert(policyData);

        if (insertError) {
          console.error('Error inserting policy:', insertError);
          throw insertError;
        }
      }

      toast({
        title: "Success",
        description: "Country policies updated successfully",
      });

      // Clear form after successful update
      setJsonInput("");
      setSelectedCountry(null);
      setSearchTerm("");
    } catch (error) {
      console.error("Error updating country policies:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update country policies",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-4 p-4">
      <h2 className="text-2xl font-bold mb-4">Update Country Policies</h2>
      
      <div className="flex flex-col space-y-2">
        <label className="text-sm font-medium">Select Country</label>
        <div className="relative">
          <Input
            type="text"
            placeholder="Search for a country..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setShowCountrySuggestions(true);
            }}
            onFocus={() => setShowCountrySuggestions(true)}
            className="w-full"
          />
          
          {showCountrySuggestions && (searchTerm.length >= 2) && (
            <div className="absolute z-10 w-full mt-1 bg-white rounded-md shadow-lg">
              {isLoading ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              ) : countries && countries.length > 0 ? (
                <ul className="max-h-60 overflow-auto py-1">
                  {countries.map((country) => (
                    <li
                      key={country.code}
                      className="px-4 py-2 hover:bg-accent cursor-pointer"
                      onClick={() => {
                        setSelectedCountry(country);
                        setSearchTerm(country.name);
                        setShowCountrySuggestions(false);
                      }}
                    >
                      {country.name} ({country.code})
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  No countries found
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col space-y-2">
        <label className="text-sm font-medium">Country Policies JSON</label>
        <Textarea
          value={jsonInput}
          onChange={(e) => setJsonInput(e.target.value)}
          placeholder="Paste the country policies JSON here..."
          className="min-h-[400px] font-mono"
        />
        <p className="text-sm text-muted-foreground">
          Expected fields (case-insensitive): policy_type, title, description, requirements, documentation_needed, 
          fees, restrictions, quarantine_requirements, vaccination_requirements, additional_notes, 
          policy_url, all_blood_tests, all_other_biological_tests, required_ports_of_entry
        </p>
        {selectedCountry && (
          <p className="text-sm text-muted-foreground">
            Selected country: {selectedCountry.name} ({selectedCountry.code})
          </p>
        )}
      </div>

      <Button onClick={handleUpdate} className="w-full">
        Update Country Policies
      </Button>
    </div>
  );
};

export default CountryPolicyUpdate;
