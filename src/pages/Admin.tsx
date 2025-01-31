import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const Admin = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState<{[key: string]: boolean}>({});
  const [clearData, setClearData] = useState<{[key: string]: boolean}>({
    airlines: false,
    airports: false,
    petPolicies: false
  });

  const handleSync = async (type: 'airlines' | 'airports' | 'petPolicies') => {
    setIsLoading(prev => ({ ...prev, [type]: true }));
    try {
      if (clearData[type]) {
        // Clear existing data first
        const { error: clearError } = await supabase.rpc('cleanup_airlines_data');
        if (clearError) throw clearError;
      }

      // Call the appropriate sync function
      const functionName = type === 'airlines' 
        ? 'sync_airline_data' 
        : type === 'airports' 
          ? 'sync_airport_data' 
          : 'analyze_pet_policies';

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
      <h1 className="text-3xl font-bold mb-8">Admin Dashboard</h1>
      
      <div className="grid gap-6">
        {/* Airlines Sync */}
        <div className="p-6 border rounded-lg bg-card">
          <h2 className="text-xl font-semibold mb-4">Airlines Synchronization</h2>
          <div className="flex items-center space-x-2 mb-4">
            <Checkbox 
              id="clearAirlines"
              checked={clearData.airlines}
              onCheckedChange={(checked) => 
                setClearData(prev => ({ ...prev, airlines: checked === true }))
              }
            />
            <Label htmlFor="clearAirlines">Clear existing airline data first</Label>
          </div>
          <Button 
            onClick={() => handleSync('airlines')}
            disabled={isLoading.airlines}
          >
            {isLoading.airlines ? "Syncing Airlines..." : "Sync Airlines"}
          </Button>
        </div>

        {/* Airports Sync */}
        <div className="p-6 border rounded-lg bg-card">
          <h2 className="text-xl font-semibold mb-4">Airports Synchronization</h2>
          <div className="flex items-center space-x-2 mb-4">
            <Checkbox 
              id="clearAirports"
              checked={clearData.airports}
              onCheckedChange={(checked) => 
                setClearData(prev => ({ ...prev, airports: checked === true }))
              }
            />
            <Label htmlFor="clearAirports">Clear existing airport data first</Label>
          </div>
          <Button 
            onClick={() => handleSync('airports')}
            disabled={isLoading.airports}
          >
            {isLoading.airports ? "Syncing Airports..." : "Sync Airports"}
          </Button>
        </div>

        {/* Pet Policies Sync */}
        <div className="p-6 border rounded-lg bg-card">
          <h2 className="text-xl font-semibold mb-4">Pet Policies Synchronization</h2>
          <div className="flex items-center space-x-2 mb-4">
            <Checkbox 
              id="clearPolicies"
              checked={clearData.petPolicies}
              onCheckedChange={(checked) => 
                setClearData(prev => ({ ...prev, petPolicies: checked === true }))
              }
            />
            <Label htmlFor="clearPolicies">Clear existing pet policy data first</Label>
          </div>
          <Button 
            onClick={() => handleSync('petPolicies')}
            disabled={isLoading.petPolicies}
          >
            {isLoading.petPolicies ? "Syncing Pet Policies..." : "Sync Pet Policies"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Admin;