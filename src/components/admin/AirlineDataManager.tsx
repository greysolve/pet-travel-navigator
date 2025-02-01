import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

export const AirlineDataManager = () => {
  const [editingAirline, setEditingAirline] = useState<string | null>(null);
  const [websiteInput, setWebsiteInput] = useState("");

  const { data: airlines, isLoading, refetch } = useQuery({
    queryKey: ['airlines-missing-data'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('airlines')
        .select(`
          id,
          name,
          iata_code,
          website,
          pet_policies (
            policy_url
          )
        `)
        .eq('active', true)
        .order('name');

      if (error) throw error;
      return data;
    },
  });

  const handleEditWebsite = (airlineId: string, currentWebsite: string | null) => {
    setEditingAirline(airlineId);
    setWebsiteInput(currentWebsite || '');
  };

  const handleSaveWebsite = async (airlineId: string) => {
    try {
      const { error } = await supabase
        .from('airlines')
        .update({ 
          website: websiteInput,
          updated_at: new Date().toISOString()
        })
        .eq('id', airlineId);

      if (error) throw error;

      toast({
        title: "Website Updated",
        description: "The airline website has been successfully updated.",
      });

      setEditingAirline(null);
      setWebsiteInput("");
      refetch();
    } catch (error) {
      console.error('Error updating airline website:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update airline website. Please try again.",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Airline Data Management</h2>
      </div>

      <ScrollArea className="h-[600px] rounded-md border">
        <div className="p-4 space-y-4">
          {airlines?.map((airline) => (
            <div key={airline.id} className="p-4 border rounded-lg space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">{airline.name}</h3>
                  {airline.iata_code && (
                    <p className="text-sm text-muted-foreground">
                      IATA: {airline.iata_code}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                {editingAirline === airline.id ? (
                  <div className="flex items-center gap-2">
                    <Input
                      value={websiteInput}
                      onChange={(e) => setWebsiteInput(e.target.value)}
                      placeholder="Enter website URL..."
                      className="flex-1"
                    />
                    <Button 
                      onClick={() => handleSaveWebsite(airline.id)}
                      size="sm"
                    >
                      Save
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        setEditingAirline(null);
                        setWebsiteInput("");
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-sm font-medium">Website</p>
                      <p className="text-sm text-muted-foreground">
                        {airline.website || "No website specified"}
                      </p>
                      {airline.pet_policies?.[0]?.policy_url && (
                        <>
                          <p className="text-sm font-medium">Pet Policy URL</p>
                          <p className="text-sm text-muted-foreground">
                            {airline.pet_policies[0].policy_url}
                          </p>
                        </>
                      )}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditWebsite(airline.id, airline.website)}
                    >
                      Edit Website
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};