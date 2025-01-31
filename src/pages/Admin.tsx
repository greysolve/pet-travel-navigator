import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";

const Admin = () => {
  const [isLoading, setIsLoading] = useState<{[key: string]: boolean}>({});
  const [clearData, setClearData] = useState<{[key: string]: boolean}>({
    airlines: false,
    airports: false,
    petPolicies: false,
    routes: false
  });

  const handleSync = async (type: 'airlines' | 'airports' | 'petPolicies' | 'routes') => {
    setIsLoading(prev => ({ ...prev, [type]: true }));
    try {
      if (clearData[type]) {
        // Clear existing data first
        const { error: clearError } = await supabase
          .from(type)
          .delete()
          .neq('id', '00000000-0000-0000-0000-000000000000'); // Prevent deleting all records
        
        if (clearError) throw clearError;
      }

      // Call the appropriate sync function
      const functionName = type === 'airlines' 
        ? 'sync_airline_data' 
        : type === 'airports' 
          ? 'sync_airport_data' 
          : type === 'routes'
            ? 'sync_route_data'
            : 'analyze_pet_policies';

      console.log(`Calling ${functionName} edge function...`);
      const { error } = await supabase.functions.invoke(functionName);
      if (error) throw error;

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

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-4xl font-bold mb-8">Admin Dashboard</h1>
      
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
          <p className="mt-4 text-lg text-muted-foreground">
            Syncs airport data from the Cirium FlightStats API
          </p>
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
      </div>
    </div>
  );
};

export default Admin;