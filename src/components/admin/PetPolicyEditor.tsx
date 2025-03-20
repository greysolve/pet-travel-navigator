
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/hooks/use-toast";
import { Loader2, Search, ExternalLink } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

const PetPolicyEditor = () => {
  const [iataCode, setIataCode] = useState("");
  const [forceUpdate, setForceUpdate] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // First, fetch the airline data
  const { 
    data: airlineData, 
    isLoading: isAirlineLoading, 
    error: airlineError,
    refetch: refetchAirline
  } = useQuery({
    queryKey: ["airline-editor", iataCode],
    queryFn: async () => {
      if (!iataCode || iataCode.length < 2) return null;
      
      const { data, error } = await supabase
        .from('airlines')
        .select('id, name, iata_code, website, last_policy_update')
        .eq('iata_code', iataCode.toUpperCase())
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: iataCode.length >= 2,
  });

  // Then fetch the pet policy in a separate query
  const {
    data: policyData,
    isLoading: isPolicyLoading,
    error: policyError,
    refetch: refetchPolicy
  } = useQuery({
    queryKey: ["airline-policy-editor", airlineData?.id],
    queryFn: async () => {
      if (!airlineData?.id) return null;
      
      const { data, error } = await supabase
        .from('pet_policies')
        .select('*')
        .eq('airline_id', airlineData.id)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!airlineData?.id,
  });

  const handleSearch = () => {
    if (iataCode.length < 2) {
      toast({
        title: "Error",
        description: "Please enter a valid IATA code (minimum 2 characters)",
        variant: "destructive"
      });
      return;
    }
    
    refetchAirline();
  };

  const handleAnalyzePolicy = async () => {
    if (!airlineData) return;
    
    setIsAnalyzing(true);
    
    try {
      // Call the Supabase function to analyze this specific airline
      const response = await supabase.functions.invoke('analyze_pet_policies', {
        body: {
          mode: 'update',
          forceContentComparison: forceUpdate,
          airlines: [airlineData.id]
        }
      });
      
      if (response.error) throw new Error(response.error.message);
      
      toast({
        title: "Success",
        description: "Pet policy analysis initiated successfully",
      });
      
      // Refetch both airline and policy data after a short delay
      setTimeout(() => {
        refetchAirline();
        refetchPolicy();
      }, 3000);
      
    } catch (error) {
      console.error("Error analyzing policy:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to analyze pet policy",
        variant: "destructive"
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "Never";
    return new Date(dateString).toLocaleString();
  };

  const formatPolicyData = (policy) => {
    if (!policy) return "No policy data available";
    
    const formattedData = {
      pet_types_allowed: policy.pet_types_allowed || [],
      size_restrictions: policy.size_restrictions || {},
      fees: policy.fees || {},
      carrier_requirements_cabin: policy.carrier_requirements_cabin || "None specified",
      carrier_requirements_cargo: policy.carrier_requirements_cargo || "None specified",
      documentation_needed: policy.documentation_needed || [],
      breed_restrictions: policy.breed_restrictions || [],
      temperature_restrictions: policy.temperature_restrictions || "None specified"
    };
    
    return JSON.stringify(formattedData, null, 2);
  };

  const isLoading = isAirlineLoading || isPolicyLoading;

  return (
    <div className="space-y-4 p-4">
      <h2 className="text-2xl font-bold mb-4">Pet Policy Editor</h2>
      
      <div className="flex flex-col space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Search Airline Policy</CardTitle>
            <CardDescription>
              Enter an airline IATA code to view its current pet policy
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <label className="text-sm font-medium mb-1 block">
                  Airline IATA Code
                </label>
                <Input
                  placeholder="e.g. AA, DL, UA"
                  value={iataCode}
                  onChange={(e) => setIataCode(e.target.value.toUpperCase())}
                  className="w-full"
                  maxLength={2}
                />
              </div>
              
              <Button onClick={handleSearch} disabled={iataCode.length < 2 || isLoading}>
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
                Search
              </Button>
            </div>
            
            <div className="mt-4 flex items-center space-x-2">
              <Checkbox 
                id="force-update" 
                checked={forceUpdate}
                onCheckedChange={(checked) => setForceUpdate(checked === true)}
              />
              <label
                htmlFor="force-update"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Force update (analyze policy even if recently updated)
              </label>
            </div>
          </CardContent>
        </Card>
        
        {airlineData && (
          <Card>
            <CardHeader>
              <CardTitle>{airlineData.name} ({airlineData.iata_code})</CardTitle>
              <CardDescription>
                Last policy update: {formatDate(airlineData.last_policy_update)}
              </CardDescription>
              {airlineData.website && (
                <a 
                  href={airlineData.website} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-sm text-blue-500 flex items-center hover:underline"
                >
                  Official Website <ExternalLink className="ml-1 h-3 w-3" />
                </a>
              )}
            </CardHeader>
            
            <CardContent>
              <div className="space-y-4">
                {policyData?.policy_url && (
                  <div>
                    <a 
                      href={policyData.policy_url} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="text-sm text-blue-500 flex items-center hover:underline"
                    >
                      Pet Policy URL <ExternalLink className="ml-1 h-3 w-3" />
                    </a>
                  </div>
                )}
                
                <div>
                  <h3 className="text-lg font-semibold">Current Policy</h3>
                  <pre className="mt-2 whitespace-pre-wrap bg-muted p-4 rounded-md text-xs overflow-auto max-h-[400px]">
                    {formatPolicyData(policyData)}
                  </pre>
                </div>
              </div>
            </CardContent>
            
            <CardFooter>
              <Button 
                onClick={handleAnalyzePolicy} 
                disabled={isAnalyzing}
                className="w-full"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Analyzing Policy (Web Search Enhanced)...
                  </>
                ) : (
                  "Analyze/Update Pet Policy with Web Search"
                )}
              </Button>
            </CardFooter>
          </Card>
        )}
        
        {(airlineError || policyError) && (
          <div className="text-destructive">
            Error: {airlineError?.message || policyError?.message}
          </div>
        )}
      </div>
    </div>
  );
};

export default PetPolicyEditor;
