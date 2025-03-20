
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { PetPolicy } from "@/components/flight-results/types";

export const PetPolicyAnalyzer = () => {
  const { toast } = useToast();
  const [airlineCode, setAirlineCode] = useState("");
  const [forceUpdate, setForceUpdate] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [apiResponse, setApiResponse] = useState<any>(null);

  // Find airline by IATA code
  const { data: airline, isLoading: isLoadingAirline, refetch: refetchAirline } = useQuery({
    queryKey: ["airline", airlineCode],
    queryFn: async () => {
      if (!airlineCode) return null;
      
      const { data, error } = await supabase
        .from("airlines")
        .select("id, name, iata_code, website, last_policy_update")
        .eq("iata_code", airlineCode.toUpperCase())
        .single();
        
      if (error) throw error;
      return data;
    },
    enabled: false,
  });

  // Get current pet policy with proper typing
  const { data: petPolicy, isLoading: isLoadingPolicy, refetch: refetchPolicy } = useQuery({
    queryKey: ["petPolicy", airline?.id],
    queryFn: async () => {
      if (!airline?.id) return null;
      
      const { data, error } = await supabase
        .from("pet_policies")
        .select("*")
        .eq("airline_id", airline.id)
        .single();
        
      if (error && error.code !== 'PGRST116') throw error;
      return data as PetPolicy | null;
    },
    enabled: !!airline,
  });

  const handleSearch = async () => {
    if (!airlineCode) {
      toast({
        title: "Error",
        description: "Please enter an airline IATA code",
        variant: "destructive",
      });
      return;
    }
    
    try {
      await refetchAirline();
      await refetchPolicy();
    } catch (error) {
      toast({
        title: "Error",
        description: `Error fetching airline: ${error.message}`,
        variant: "destructive",
      });
    }
  };

  const handleAnalyze = async () => {
    if (!airline) {
      toast({
        title: "Error",
        description: "No airline selected",
        variant: "destructive",
      });
      return;
    }
    
    setIsAnalyzing(true);
    setApiResponse(null);
    
    try {
      const response = await supabase.functions.invoke("analyze_batch_pet_policies", {
        method: "POST",
        body: {
          airlines: [{
            id: airline.id,
            name: airline.name,
            iata_code: airline.iata_code,
            policy_url: airline.website,
          }]
        },
      });
      
      // Store the raw API response for debugging
      setApiResponse(response);
      
      if (response.error) throw new Error(response.error);
      
      if (response.data.success) {
        toast({
          title: "Success",
          description: `Successfully analyzed pet policy for ${airline.name}`,
        });
        
        // Refetch the data
        await refetchAirline();
        await refetchPolicy();
      } else {
        toast({
          title: "Error",
          description: response.data.errors?.[0]?.error || "Unknown error analyzing pet policy",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: `Error analyzing pet policy: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Pet Policy Analyzer</CardTitle>
          <CardDescription>
            Debug and analyze pet policies for specific airlines
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-4">
            <div className="flex-1">
              <label className="text-sm font-medium">Airline IATA Code</label>
              <Input
                placeholder="e.g. AA"
                value={airlineCode}
                onChange={(e) => setAirlineCode(e.target.value.toUpperCase())}
                className="mt-1"
              />
            </div>
            <Button onClick={handleSearch} disabled={isLoadingAirline || !airlineCode}>
              Search
            </Button>
          </div>

          {airline && (
            <div className="mt-6 space-y-4">
              <div>
                <h3 className="text-lg font-semibold">{airline.name} ({airline.iata_code})</h3>
                <p className="text-sm text-gray-500">
                  ID: {airline.id}
                  <br />
                  Website: {airline.website || "Not set"}
                  <br />
                  Last Policy Update: {airline.last_policy_update ? new Date(airline.last_policy_update).toLocaleString() : "Never"}
                </p>
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="force-update" 
                  checked={forceUpdate} 
                  onCheckedChange={(checked) => setForceUpdate(!!checked)} 
                />
                <label htmlFor="force-update" className="text-sm">Force update (ignore timestamp)</label>
              </div>
              
              <Button 
                onClick={handleAnalyze} 
                disabled={isAnalyzing} 
                className="w-full"
              >
                {isAnalyzing ? "Analyzing..." : "Analyze Pet Policy"}
              </Button>
            </div>
          )}
          
          {apiResponse && (
            <div className="mt-8">
              <h3 className="text-lg font-semibold mb-2">Raw API Response</h3>
              <Separator className="my-2" />
              <div className="bg-gray-100 p-4 rounded-md overflow-auto max-h-96">
                <pre className="text-xs whitespace-pre-wrap break-words">
                  {JSON.stringify(apiResponse, null, 2)}
                </pre>
              </div>
            </div>
          )}
          
          {petPolicy && (
            <div className="mt-8">
              <h3 className="text-lg font-semibold mb-2">Current Pet Policy</h3>
              <Separator className="my-2" />
              
              <div className="space-y-4 text-sm">
                <div>
                  <strong>Policy URL:</strong> {petPolicy.policy_url || "Not set"}
                </div>
                
                <div>
                  <strong>Pet Types Allowed:</strong>
                  <ul className="list-disc pl-5 mt-1">
                    {petPolicy.pet_types_allowed?.map((type, i) => (
                      <li key={i}>{type}</li>
                    )) || <li>None specified</li>}
                  </ul>
                </div>
                
                <div>
                  <strong>Size Restrictions:</strong>
                  <ul className="list-disc pl-5 mt-1">
                    <li>Max Weight Cabin: {petPolicy.size_restrictions?.max_weight_cabin || "Not specified"}</li>
                    <li>Max Weight Cargo: {petPolicy.size_restrictions?.max_weight_cargo || "Not specified"}</li>
                    <li>Carrier Dimensions: {petPolicy.size_restrictions?.carrier_dimensions_cabin || "Not specified"}</li>
                  </ul>
                </div>
                
                <div>
                  <strong>Fees:</strong>
                  <ul className="list-disc pl-5 mt-1">
                    <li>In Cabin: {petPolicy.fees?.in_cabin || "Not specified"}</li>
                    <li>Cargo: {petPolicy.fees?.cargo || "Not specified"}</li>
                  </ul>
                </div>
                
                <div>
                  <strong>Documentation Needed:</strong>
                  <ul className="list-disc pl-5 mt-1">
                    {petPolicy.documentation_needed?.length > 0 
                      ? petPolicy.documentation_needed.map((doc, i) => <li key={i}>{doc}</li>)
                      : <li>None specified</li>
                    }
                  </ul>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
