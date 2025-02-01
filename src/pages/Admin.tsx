import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AirlineDataManager } from "@/components/admin/AirlineDataManager";

const Admin = () => {
  const [isLoading, setIsLoading] = useState<{[key: string]: boolean}>({});
  const [clearData, setClearData] = useState<{[key: string]: boolean}>({
    airlines: false,
    airports: false,
    petPolicies: false,
    routes: false,
    countryPolicies: false
  });
  const [syncProgress, setSyncProgress] = useState<{
    total: number;
    processed: number;
    lastCountry: string | null;
    processedCountries: string[];
    errorCountries: string[];
    startTime: number | null;
  }>({
    total: 0,
    processed: 0,
    lastCountry: null,
    processedCountries: [],
    errorCountries: [],
    startTime: null
  });

  const [petPolicyProgress, setPetPolicyProgress] = useState<{
    total: number;
    processed: number;
    lastAirline: string | null;
    processedAirlines: string[];
    errorAirlines: string[];
    startTime: number | null;
  }>({
    total: 0,
    processed: 0,
    lastAirline: null,
    processedAirlines: [],
    errorAirlines: [],
    startTime: null
  });

  const handleSync = async (type: 'airlines' | 'airports' | 'petPolicies' | 'routes' | 'countryPolicies') => {
    setIsLoading(prev => ({ ...prev, [type]: true }));
    try {
      if (clearData[type]) {
        const { error: clearError } = await supabase
          .from(type === 'countryPolicies' ? 'country_policies' : type)
          .delete()
          .neq('id', '00000000-0000-0000-0000-000000000000');
        
        if (clearError) throw clearError;
      }

      if (type === 'petPolicies') {
        setPetPolicyProgress({
          total: 0,
          processed: 0,
          lastAirline: null,
          processedAirlines: [],
          errorAirlines: [],
          startTime: Date.now()
        });

        const { data: airlines, error: airlinesError } = await supabase
          .from('airlines')
          .select('id, name, website')
          .eq('active', true);

        if (airlinesError) throw airlinesError;

        console.log(`Found ${airlines?.length} active airlines to analyze`);
        setPetPolicyProgress(prev => ({ ...prev, total: airlines?.length || 0 }));

        let continuationToken = null;
        let completed = false;
        let totalProcessed = 0;

        while (!completed) {
          console.log(`Processing batch of airlines with continuation token:`, continuationToken);
          const { data, error } = await supabase.functions.invoke('analyze_pet_policies', {
            body: {
              lastProcessedAirline: continuationToken,
              batchSize: 3 // Process 3 airlines at a time
            }
          });

          if (error) throw error;
          console.log(`Pet policy batch sync response:`, data);

          totalProcessed += data.processed_count;
          setPetPolicyProgress(prev => ({
            ...prev,
            processed: totalProcessed,
            lastAirline: data.continuation_token,
            processedAirlines: [...prev.processedAirlines, ...data.processed_airlines],
            errorAirlines: [...prev.errorAirlines, ...data.error_airlines]
          }));

          if (data.continuation_token) {
            continuationToken = data.continuation_token;
            // Add delay between batches to avoid rate limits
            await new Promise(resolve => setTimeout(resolve, 2000));
          } else {
            completed = true;
          }
        }

        toast({
          title: "Pet Policies Sync Complete",
          description: `Successfully processed ${totalProcessed} airlines.`,
        });
      } else if (type === 'countryPolicies') {
        let continuationToken = null;
        let completed = false;
        
        // Reset progress state at the start of sync
        setSyncProgress({
          total: 0,
          processed: 0,
          lastCountry: null,
          processedCountries: [],
          errorCountries: [],
          startTime: Date.now()
        });

        while (!completed) {
          console.log(`Calling sync_country_policies with continuation token:`, continuationToken);
          const { data, error } = await supabase.functions.invoke('sync_country_policies', {
            body: { lastProcessedCountry: continuationToken }
          });

          if (error) throw error;
          console.log(`Country policies sync response:`, data);

          if (data.total_countries > 0) {
            setSyncProgress(prev => ({
              ...prev,
              total: data.total_countries,
              processed: prev.processed + data.processed_policies,
              lastCountry: data.continuation_token,
              processedCountries: [...prev.processedCountries, ...data.processed_countries],
              errorCountries: [...prev.errorCountries, ...data.error_countries]
            }));
          }

          if (data.continuation_token) {
            continuationToken = data.continuation_token;
            // Add delay between batches to avoid rate limits
            await new Promise(resolve => setTimeout(resolve, 2000));
          } else {
            completed = true;
          }

          if (!data.success) {
            throw new Error('Sync failed');
          }
        }

        toast({
          title: "Country Policies Sync Complete",
          description: `Successfully processed ${syncProgress.processed} countries.`,
        });
      } else {
        // Call other sync functions as before
        const functionName = type === 'airlines' 
          ? 'sync_airline_data' 
          : type === 'airports' 
            ? 'sync_airport_data' 
            : 'sync_route_data';

        console.log(`Calling ${functionName} edge function...`);
        const { data, error } = await supabase.functions.invoke(functionName);

        if (error) throw error;
        console.log(`${type} sync response:`, data);
      }

      toast({
        title: "Sync Successful",
        description: `Successfully synchronized ${type} data.`,
      });
    } catch (error: any) {
      console.error(`Error syncing ${type}:`, error);
      toast({
        variant: "destructive",
        title: "Sync Failed",
        description: error.message || `Failed to sync ${type} data.`,
      });
    } finally {
      setIsLoading(prev => ({ ...prev, [type]: false }));
    }
  };

  const getElapsedTime = (startTime: number | null) => {
    if (!startTime) return '';
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    const minutes = Math.floor(elapsed / 60);
    const seconds = elapsed % 60;
    return `${minutes}m ${seconds}s`;
  };

  const getEstimatedTimeRemaining = (progress: { total: number, processed: number, startTime: number | null }) => {
    if (!progress.startTime || progress.processed === 0) return 'Calculating...';
    
    const elapsed = (Date.now() - progress.startTime) / 1000;
    const ratePerItem = elapsed / progress.processed;
    const remaining = (progress.total - progress.processed) * ratePerItem;
    
    const minutes = Math.floor(remaining / 60);
    const seconds = Math.floor(remaining % 60);
    return `~${minutes}m ${seconds}s`;
  };

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-4xl font-bold mb-8">Admin Dashboard</h1>
      
      <Tabs defaultValue="sync" className="space-y-8">
        <TabsList>
          <TabsTrigger value="sync">Data Sync</TabsTrigger>
          <TabsTrigger value="airlines">Airline Data</TabsTrigger>
        </TabsList>

        <TabsContent value="sync" className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Airlines Sync */}
            <div className="p-8 border rounded-lg bg-card shadow-sm">
              <h2 className="text-2xl font-semibold mb-6">Airlines Synchronization</h2>
              <div className="flex items-center space-x-3 mb-6">
                <Checkbox 
                  id="clearAirlines"
                  checked={clearData.airlines}
                  onCheckedChange={(checked) => 
                    setClearData(prev => ({ ...prev, airlines: checked === true }))
                  }
                />
                <Label htmlFor="clearAirlines" className="text-lg">Clear existing airline data first</Label>
              </div>
              <Button 
                onClick={() => handleSync('airlines')}
                disabled={isLoading.airlines}
                size="lg"
                className="w-full text-lg"
              >
                {isLoading.airlines ? "Syncing Airlines..." : "Sync Airlines"}
              </Button>
            </div>

            {/* Airports Sync */}
            <div className="p-8 border rounded-lg bg-card shadow-sm">
              <h2 className="text-2xl font-semibold mb-6">Airports Synchronization</h2>
              <div className="flex items-center space-x-3 mb-6">
                <Checkbox 
                  id="clearAirports"
                  checked={clearData.airports}
                  onCheckedChange={(checked) => 
                    setClearData(prev => ({ ...prev, airports: checked === true }))
                  }
                />
                <Label htmlFor="clearAirports" className="text-lg">Clear existing airport data first</Label>
              </div>
              <Button 
                onClick={() => handleSync('airports')}
                disabled={isLoading.airports}
                size="lg"
                className="w-full text-lg"
              >
                {isLoading.airports ? "Syncing Airports..." : "Sync Airports"}
              </Button>
            </div>

            {/* Pet Policies Sync */}
            <div className="p-8 border rounded-lg bg-card shadow-sm">
              <h2 className="text-2xl font-semibold mb-6">Pet Policies Synchronization</h2>
              <div className="flex items-center space-x-3 mb-6">
                <Checkbox 
                  id="clearPolicies"
                  checked={clearData.petPolicies}
                  onCheckedChange={(checked) => 
                    setClearData(prev => ({ ...prev, petPolicies: checked === true }))
                  }
                />
                <Label htmlFor="clearPolicies" className="text-lg">Clear existing pet policy data first</Label>
              </div>

              {petPolicyProgress.total > 0 && (
                <div className="mb-6 space-y-4">
                  <Progress 
                    value={Math.min((petPolicyProgress.processed / petPolicyProgress.total) * 100, 100)} 
                    className="mb-2"
                  />
                  <div className="text-sm space-y-2">
                    <p>Progress: {petPolicyProgress.processed} of {petPolicyProgress.total} airlines ({((petPolicyProgress.processed / petPolicyProgress.total) * 100).toFixed(1)}%)</p>
                    <p>Elapsed time: {getElapsedTime(petPolicyProgress.startTime)}</p>
                    <p>Estimated time remaining: {getEstimatedTimeRemaining(petPolicyProgress)}</p>
                    {petPolicyProgress.lastAirline && (
                      <p>Last processed: {petPolicyProgress.lastAirline}</p>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h3 className="font-semibold mb-2">Processed Airlines ({petPolicyProgress.processedAirlines.length})</h3>
                      <ScrollArea className="h-32 rounded border p-2">
                        <div className="space-y-1">
                          {petPolicyProgress.processedAirlines.map((airline, i) => (
                            <div key={i} className="text-sm">{airline}</div>
                          ))}
                        </div>
                      </ScrollArea>
                    </div>
                    
                    {petPolicyProgress.errorAirlines.length > 0 && (
                      <div>
                        <h3 className="font-semibold mb-2 text-destructive">Errors ({petPolicyProgress.errorAirlines.length})</h3>
                        <ScrollArea className="h-32 rounded border border-destructive/20 p-2">
                          <div className="space-y-1">
                            {petPolicyProgress.errorAirlines.map((airline, i) => (
                              <div key={i} className="text-sm text-destructive">{airline}</div>
                            ))}
                          </div>
                        </ScrollArea>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <Button 
                onClick={() => handleSync('petPolicies')}
                disabled={isLoading.petPolicies}
                size="lg"
                className="w-full text-lg"
              >
                {isLoading.petPolicies ? "Syncing Pet Policies..." : "Sync Pet Policies"}
              </Button>
            </div>

            {/* Routes Sync */}
            <div className="p-8 border rounded-lg bg-card shadow-sm">
              <h2 className="text-2xl font-semibold mb-6">Routes Synchronization</h2>
              <div className="flex items-center space-x-3 mb-6">
                <Checkbox 
                  id="clearRoutes"
                  checked={clearData.routes}
                  onCheckedChange={(checked) => 
                    setClearData(prev => ({ ...prev, routes: checked === true }))
                  }
                />
                <Label htmlFor="clearRoutes" className="text-lg">Clear existing route data first</Label>
              </div>
              <Button 
                onClick={() => handleSync('routes')}
                disabled={isLoading.routes}
                size="lg"
                className="w-full text-lg"
              >
                {isLoading.routes ? "Syncing Routes..." : "Sync Routes"}
              </Button>
            </div>

            {/* Country Policies Sync */}
            <div className="p-8 border rounded-lg bg-card shadow-sm">
              <h2 className="text-2xl font-semibold mb-6">Country Policies Synchronization</h2>
              <div className="flex items-center space-x-3 mb-6">
                <Checkbox 
                  id="clearCountryPolicies"
                  checked={clearData.countryPolicies}
                  onCheckedChange={(checked) => 
                    setClearData(prev => ({ ...prev, countryPolicies: checked === true }))
                  }
                />
                <Label htmlFor="clearCountryPolicies" className="text-lg">Clear existing country policy data first</Label>
              </div>
              
              {syncProgress.total > 0 && (
                <div className="mb-6 space-y-4">
                  <Progress 
                    value={(syncProgress.processed / syncProgress.total) * 100} 
                    className="mb-2"
                  />
                  <div className="text-sm space-y-2">
                    <p>Progress: {syncProgress.processed} of {syncProgress.total} countries ({((syncProgress.processed / syncProgress.total) * 100).toFixed(1)}%)</p>
                    <p>Elapsed time: {getElapsedTime(syncProgress.startTime)}</p>
                    <p>Estimated time remaining: {getEstimatedTimeRemaining(syncProgress)}</p>
                    {syncProgress.lastCountry && (
                      <p>Last processed: {syncProgress.lastCountry}</p>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h3 className="font-semibold mb-2">Processed Countries ({syncProgress.processedCountries.length})</h3>
                      <ScrollArea className="h-32 rounded border p-2">
                        <div className="space-y-1">
                          {syncProgress.processedCountries.map((country, i) => (
                            <div key={i} className="text-sm">{country}</div>
                          ))}
                        </div>
                      </ScrollArea>
                    </div>
                    
                    {syncProgress.errorCountries.length > 0 && (
                      <div>
                        <h3 className="font-semibold mb-2 text-destructive">Errors ({syncProgress.errorCountries.length})</h3>
                        <ScrollArea className="h-32 rounded border border-destructive/20 p-2">
                          <div className="space-y-1">
                            {syncProgress.errorCountries.map((country, i) => (
                              <div key={i} className="text-sm text-destructive">{country}</div>
                            ))}
                          </div>
                        </ScrollArea>
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              <Button 
                onClick={() => handleSync('countryPolicies')}
                disabled={isLoading.countryPolicies}
                size="lg"
                className="w-full text-lg"
              >
                {isLoading.countryPolicies ? "Syncing Country Policies..." : "Sync Country Policies"}
              </Button>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="airlines">
          <AirlineDataManager />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Admin;