import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { PetProfileCard } from "./PetProfileCard";
import { Plus } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { Database } from "@/integrations/supabase/types";

type PetProfile = Database['public']['Tables']['pet_profiles']['Row'];

export const PetTravelWallet = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [selectedPet, setSelectedPet] = useState<PetProfile | null>(null);

  const { data: pets, isLoading } = useQuery({
    queryKey: ['pet-profiles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pet_profiles')
        .select('*');
      
      if (error) throw error;
      return data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('pet_profiles')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pet-profiles'] });
      toast({
        title: "Pet profile deleted",
        description: "The pet profile has been successfully deleted.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to delete pet profile. Please try again.",
        variant: "destructive",
      });
      console.error('Error deleting pet profile:', error);
    },
  });

  const handleEdit = (pet: PetProfile) => {
    setSelectedPet(pet);
    setIsEditing(true);
  };

  const handleDelete = async (id: string) => {
    deleteMutation.mutate(id);
  };

  if (isLoading) {
    return <div>Loading pet profiles...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Pet Travel Wallet</h2>
        <Button onClick={() => setIsEditing(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Pet
        </Button>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2">
        {pets?.map((pet) => (
          <PetProfileCard
            key={pet.id}
            pet={pet}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        ))}
      </div>

      {pets?.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          No pets added yet. Click the "Add Pet" button to get started.
        </div>
      )}
    </div>
  );
};