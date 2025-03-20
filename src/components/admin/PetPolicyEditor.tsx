
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
import { Loader2, Search, ExternalLink, ArrowDown, ArrowRight } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { JsonRenderer } from "@/components/ui/json-renderer";

const PetPolicyEditor = () => {
  const [iataCode, setIataCode] = useState("");
  const [forceUpdate, setForceUpdate] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [apiResponse, setApiResponse] = useState<any>(null);
  const [responseStatus, setResponseStatus] = useState<string | null>(null);
  const [showComparison, setShowComparison] = useState(false);

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
    
    // Reset any previous API response data
    setApiResponse(null);
    setResponseStatus(null);
    refetchAirline();
  };

  const handleAnalyzePolicy = async () => {
    if (!airlineData) return;
    
    setIsAnalyzing(true);
    setApiResponse(null);
    setResponseStatus(null);
    
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
      
      // Now fetch the raw results from the batch processor
      const batchResponse = await supabase.functions.invoke('analyze_batch_pet_policies', {
        body: {
          airlines: [airlineData]
        }
      });
      
      setApiResponse(batchResponse.data);
      
      if (batchResponse.data?.results?.length > 0) {
        const hasChanged = batchResponse.data.content_changed || false;
        setResponseStatus(hasChanged ? "Policy content changed" : "Policy content unchanged");
        
        toast({
          title: "Success",
          description: `Pet policy analysis completed. ${hasChanged ? "Content changed" : "No content changes detected"}.`,
        });
      } else {
        setResponseStatus("Error in processing");
        toast({
          title: "Warning",
          description: "Pet policy analysis completed but no results returned.",
          variant: "destructive"
        });
      }
      
      // Refetch both airline and policy data
      refetchAirline();
      refetchPolicy();
      
    } catch (error) {
      console.error("Error analyzing policy:", error);
      setResponseStatus("Error");
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
                
                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="current-policy">
                    <AccordionTrigger>Current Policy</AccordionTrigger>
                    <AccordionContent>
                      <ScrollArea className="h-[400px] rounded-md border p-4">
                        <pre className="whitespace-pre-wrap text-xs">
                          {formatPolicyData(policyData)}
                        </pre>
                      </ScrollArea>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </div>
            </CardContent>
            
            <CardFooter className="flex flex-col space-y-4">
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

              {responseStatus && (
                <div className={`w-full text-center p-2 rounded ${
                  responseStatus.includes("Error") 
                    ? "bg-red-100 text-red-800" 
                    : responseStatus.includes("changed") 
                      ? "bg-green-100 text-green-800"
                      : "bg-blue-100 text-blue-800"
                }`}>
                  {responseStatus}
                </div>
              )}
            </CardFooter>
          </Card>
        )}
        
        {apiResponse && (
          <Card>
            <CardHeader>
              <CardTitle>API Response</CardTitle>
              <CardDescription>
                Raw data from the API analysis
              </CardDescription>
            </CardHeader>
            
            <CardContent>
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="raw-response">
                  <AccordionTrigger>Raw API Response</AccordionTrigger>
                  <AccordionContent>
                    <ScrollArea className="h-[400px] rounded-md border p-4">
                      {apiResponse.raw_api_response ? (
                        <JsonRenderer data={JSON.parse(apiResponse.raw_api_response)} />
                      ) : (
                        <div className="text-sm text-gray-500">No raw API response available</div>
                      )}
                    </ScrollArea>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="comparison">
                  <AccordionTrigger>Content Comparison</AccordionTrigger>
                  <AccordionContent>
                    <div className="p-2 space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">Content Changed:</span>
                        <span className={apiResponse.content_changed ? "text-green-600" : "text-amber-600"}>
                          {apiResponse.content_changed ? "Yes" : "No"}
                        </span>
                      </div>
                      
                      {apiResponse.comparison_details && (
                        <div className="rounded-md border p-3 bg-gray-50">
                          <h4 className="font-medium mb-2">Comparison Details:</h4>
                          <pre className="text-xs whitespace-pre-wrap">
                            {JSON.stringify(apiResponse.comparison_details, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="full-response">
                  <AccordionTrigger>Full Response</AccordionTrigger>
                  <AccordionContent>
                    <ScrollArea className="h-[400px] rounded-md border p-4">
                      <pre className="text-xs whitespace-pre-wrap">
                        {JSON.stringify(apiResponse, null, 2)}
                      </pre>
                    </ScrollArea>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </CardContent>
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
