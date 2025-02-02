import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PetProfile } from "@/components/pet-wallet/PetProfile";
import { AddPetDialog } from "@/components/pet-wallet/AddPetDialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/use-toast";
import { PlusCircle } from "lucide-react";

const PetWallet = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [pets, setPets] = useState<any[]>([]);
  const [isAddPetOpen, setIsAddPetOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      fetchPets();
    }
  }, [user]);

  const fetchPets = async () => {
    try {
      const { data, error } = await supabase
        .from("pet_profiles")
        .select("*")
        .eq("user_id", user?.id)
        .order("created_at", { ascending: true });

      if (error) throw error;
      setPets(data || []);
    } catch (error) {
      console.error("Error fetching pets:", error);
      toast({
        title: "Error",
        description: "Failed to load pet profiles",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4">
      <Card className="shadow-md">
        <CardHeader className="flex flex-row items-center justify-between pb-6 border-b">
          <CardTitle className="text-2xl font-semibold text-primary">
            Pet Travel Wallet
          </CardTitle>
          {pets.length < 4 && (
            <Button
              onClick={() => setIsAddPetOpen(true)}
              className="flex items-center gap-2"
            >
              <PlusCircle className="h-4 w-4" />
              Add Pet
            </Button>
          )}
        </CardHeader>
        <CardContent className="pt-6">
          {pets.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">
                No pets added yet. Add your first pet to get started!
              </p>
              <Button onClick={() => setIsAddPetOpen(true)}>Add Pet</Button>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2">
              {pets.map((pet) => (
                <PetProfile
                  key={pet.id}
                  pet={pet}
                  onUpdate={fetchPets}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <AddPetDialog
        open={isAddPetOpen}
        onOpenChange={setIsAddPetOpen}
        onSuccess={fetchPets}
      />
    </div>
  );
};

export default PetWallet;