import { useState, useEffect } from "react";
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
    [key: string]: {
      total: number;
      processed: number;
      lastProcessed: string | null;
      processedItems: string[];
      errorItems: string[];
      startTime: string | null;
      isComplete: boolean;
    };
  }>({});

  // Fetch existing sync progress on mount and periodically
  useEffect(() => {
    const fetchProgress = async () => {
      const { data, error } = await supabase
        .from('sync_progress')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching sync progress:', error);
        return;
      }

      const progressByType = data.reduce((acc, curr) => ({
        ...acc,
        [curr.type]: {
          total: curr.total,
          processed: curr.processed,
          lastProcessed: curr.last_processed,
          processedItems: curr.processed_items || [],
          errorItems: curr.error_items || [],
          startTime: curr.start_time,
          isComplete: curr.is_complete
        }
      }), {});

      setSyncProgress(progressByType);
    };

    // Fetch immediately
    fetchProgress();

    // Set up polling every 5 seconds
    const interval = setInterval(fetchProgress, 5000);

    return () => clearInterval(interval);
  }, []);

  const updateSyncProgress = async (type: string, progressData: any) => {
    const { error } = await supabase
      .from('sync_progress')
      .upsert({
        type,
        total: progressData.total,
        processed: progressData.processed,
        last_processed: progressData.lastProcessed,
        processed_items: progressData.processedItems,
        error_items: progressData.errorItems,
        start_time: progressData.startTime || new Date().toISOString(),
        is_complete: progressData.isComplete
      });

    if (error) {
      console.error(`Error updating sync progress for ${type}:`, error);
    }
  };

  const handleSync = async (type: 'airlines' | 'airports' | 'petPolicies' | 'routes' | 'countryPolicies', resume: boolean = false) => {
    setIsLoading(prev => ({ ...prev, [type]: true }));
    try {
      if (!resume && clearData[type]) {
        const { error: clearError } = await supabase
          .from(type === 'countryPolicies' ? 'country_policies' : type)
          .delete()
          .neq('id', '00000000-0000-0000-0000-000000000000');
        
        if (clearError) throw clearError;
      }

      if (type === 'petPolicies') {
        // Initialize or resume progress
        if (!resume) {
          const { data: airlines } = await supabase
            .from('airlines')
            .select('id, name, website')
            .eq('active', true);

          const initialProgress = {
            total: airlines?.length || 0,
            processed: 0,
            lastProcessed: null,
            processedItems: [],
            errorItems: [],
            startTime: new Date().toISOString(),
            isComplete: false
          };

          await updateSyncProgress('petPolicies', initialProgress);
          setSyncProgress(prev => ({ ...prev, petPolicies: initialProgress }));
        }

        let continuationToken = resume ? syncProgress.petPolicies?.lastProcessed : null;
        let completed = false;

        while (!completed) {
          const { data, error } = await supabase.functions.invoke('analyze_pet_policies', {
            body: {
              lastProcessedAirline: continuationToken,
              batchSize: 3
            }
          });

          if (error) throw error;

          const updatedProgress = {
            ...syncProgress.petPolicies,
            processed: (syncProgress.petPolicies?.processed || 0) + data.processed_count,
            lastProcessed: data.continuation_token,
            processedItems: [...(syncProgress.petPolicies?.processedItems || []), ...data.processed_airlines],
            errorItems: [...(syncProgress.petPolicies?.errorItems || []), ...data.error_airlines],
            isComplete: !data.continuation_token
          };

          await updateSyncProgress('petPolicies', updatedProgress);
          setSyncProgress(prev => ({ ...prev, petPolicies: updatedProgress }));

          if (data.continuation_token) {
            continuationToken = data.continuation_token;
            await new Promise(resolve => setTimeout(resolve, 2000));
          } else {
            completed = true;
          }
        }
      } else if (type === 'countryPolicies') {
        // Initialize progress
        if (!resume) {
          const initialProgress = {
            total: 0,
            processed: 0,
            lastProcessed: null,
            processedItems: [],
            errorItems: [],
            startTime: new Date().toISOString(),
            isComplete: false
          };

          await updateSyncProgress('countryPolicies', initialProgress);
          setSyncProgress(prev => ({ ...prev, countryPolicies: initialProgress }));
        }

        let continuationToken = resume ? syncProgress.countryPolicies?.lastProcessed : null;
        let completed = false;

        while (!completed) {
          const { data, error } = await supabase.functions.invoke('sync_country_policies', {
            body: { lastProcessedCountry: continuationToken }
          });

          if (error) throw error;

          if (data.total_countries > 0) {
            const updatedProgress = {
              ...syncProgress.countryPolicies,
              total: data.total_countries,
              processed: (syncProgress.countryPolicies?.processed || 0) + data.processed_policies,
              lastProcessed: data.continuation_token,
              processedItems: [...(syncProgress.countryPolicies?.processedItems || []), ...data.processed_countries],
              errorItems: [...(syncProgress.countryPolicies?.errorItems || []), ...data.error_countries],
              isComplete: !data.continuation_token
            };

            await updateSyncProgress('countryPolicies', updatedProgress);
            setSyncProgress(prev => ({ ...prev, countryPolicies: updatedProgress }));
          }

          if (data.continuation_token) {
            continuationToken = data.continuation_token;
            await new Promise(resolve => setTimeout(resolve, 2000));
          } else {
            completed = true;
          }
        }
      } else {
        // Handle other sync types
        const functionName = type === 'airlines' 
          ? 'sync_airline_data' 
          : type === 'airports' 
            ? 'sync_airport_data' 
            : 'sync_route_data';

        const { data, error } = await supabase.functions.invoke(functionName);
        if (error) throw error;

        // Update progress for other sync types
        await updateSyncProgress(type, {
          total: 1,
          processed: 1,
          lastProcessed: null,
          processedItems: [],
          errorItems: [],
          startTime: new Date().toISOString(),
          isComplete: true
        });
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

  const getElapsedTime = (startTime: string | null) => {
    if (!startTime) return '';
    const elapsed = Math.floor((Date.now() - new Date(startTime).getTime()) / 1000);
    const minutes = Math.floor(elapsed / 60);
    const seconds = elapsed % 60;
    return `${minutes}m ${seconds}s`;
  };

  const getEstimatedTimeRemaining = (progress: { total: number, processed: number, startTime: string | null }) => {
    if (!progress.startTime || progress.processed === 0) return 'Calculating...';
    
    const elapsed = (Date.now() - new Date(progress.startTime).getTime()) / 1000;
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

              {syncProgress.petPolicies?.total > 0 && (
                <div className="mb-6 space-y-4">
                  <Progress 
                    value={Math.min((syncProgress.petPolicies.processed / syncProgress.petPolicies.total) * 100, 100)} 
                    className="mb-2"
                  />
                  <div className="text-sm space-y-2">
                    <p>Progress: {syncProgress.petPolicies.processed} of {syncProgress.petPolicies.total} airlines ({((syncProgress.petPolicies.processed / syncProgress.petPolicies.total) * 100).toFixed(1)}%)</p>
                    <p>Elapsed time: {getElapsedTime(syncProgress.petPolicies.startTime)}</p>
                    <p>Estimated time remaining: {getEstimatedTimeRemaining(syncProgress.petPolicies)}</p>
                    {syncProgress.petPolicies.lastProcessed && (
                      <p>Last processed: {syncProgress.petPolicies.lastProcessed}</p>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h3 className="font-semibold mb-2">Processed Airlines ({syncProgress.petPolicies.processedItems.length})</h3>
                      <ScrollArea className="h-32 rounded border p-2">
                        <div className="space-y-1">
                          {syncProgress.petPolicies.processedItems.map((airline, i) => (
                            <div key={i} className="text-sm">{airline}</div>
                          ))}
                        </div>
                      </ScrollArea>
                    </div>
                    
                    {syncProgress.petPolicies.errorItems.length > 0 && (
                      <div>
                        <h3 className="font-semibold mb-2 text-destructive">Errors ({syncProgress.petPolicies.errorItems.length})</h3>
                        <ScrollArea className="h-32 rounded border border-destructive/20 p-2">
                          <div className="space-y-1">
                            {syncProgress.petPolicies.errorItems.map((airline, i) => (
                              <div key={i} className="text-sm text-destructive">{airline}</div>
                            ))}
                          </div>
                        </ScrollArea>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                {syncProgress.petPolicies?.lastProcessed && !syncProgress.petPolicies?.isComplete && (
                  <Button 
                    onClick={() => handleSync('petPolicies', true)}
                    disabled={isLoading.petPolicies}
                    size="lg"
                    className="w-full text-lg"
                  >
                    {isLoading.petPolicies ? "Resuming Sync..." : "Resume Sync"}
                  </Button>
                )}
                <Button 
                  onClick={() => handleSync('petPolicies')}
                  disabled={isLoading.petPolicies}
                  size="lg"
                  variant={syncProgress.petPolicies?.lastProcessed && !syncProgress.petPolicies?.isComplete ? "outline" : "default"}
                  className="w-full text-lg"
                >
                  {isLoading.petPolicies ? "Syncing Pet Policies..." : "Start New Sync"}
                </Button>
              </div>
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
              
              {syncProgress.countryPolicies?.total > 0 && (
                <div className="mb-6 space-y-4">
                  <Progress 
                    value={(syncProgress.countryPolicies.processed / syncProgress.countryPolicies.total) * 100} 
                    className="mb-2"
                  />
                  <div className="text-sm space-y-2">
                    <p>Progress: {syncProgress.countryPolicies.processed} of {syncProgress.countryPolicies.total} countries ({((syncProgress.countryPolicies.processed / syncProgress.countryPolicies.total) * 100).toFixed(1)}%)</p>
                    <p>Elapsed time: {getElapsedTime(syncProgress.countryPolicies.startTime)}</p>
                    <p>Estimated time remaining: {getEstimatedTimeRemaining(syncProgress.countryPolicies)}</p>
                    {syncProgress.countryPolicies.lastProcessed && (
                      <p>Last processed: {syncProgress.countryPolicies.lastProcessed}</p>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h3 className="font-semibold mb-2">Processed Countries ({syncProgress.countryPolicies.processedItems.length})</h3>
                      <ScrollArea className="h-32 rounded border p-2">
                        <div className="space-y-1">
                          {syncProgress.countryPolicies.processedItems.map((country, i) => (
                            <div key={i} className="text-sm">{country}</div>
                          ))}
                        </div>
                      </ScrollArea>
                    </div>
                    
                    {syncProgress.countryPolicies.errorItems.length > 0 && (
                      <div>
                        <h3 className="font-semibold mb-2 text-destructive">Errors ({syncProgress.countryPolicies.errorItems.length})</h3>
                        <ScrollArea className="h-32 rounded border border-destructive/20 p-2">
                          <div className="space-y-1">
                            {syncProgress.countryPolicies.errorItems.map((country, i) => (
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
