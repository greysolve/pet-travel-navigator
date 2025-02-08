
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { PetProfileCard } from "./PetProfileCard";
import { Plus, PawPrint } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { Database } from "@/integrations/supabase/types";
import { PetProfileForm } from "./PetProfileForm";

type PetProfile = Database['public']['Tables']['pet_profiles']['Row'];

export const PetTravelWallet = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingPet, setEditingPet] = useState<PetProfile | null>(null);

  const { data: pets, isLoading } = useQuery({
    queryKey: ['pet-profiles'],
    queryFn: async () => {
      console.log('Fetching pet profiles...');
      const { data, error } = await supabase
        .from('pet_profiles')
        .select('*');
      
      if (error) {
        console.error('Error fetching pet profiles:', error);
        throw error;
      }
      console.log('Fetched pet profiles:', data);
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
    console.log('1. Pet data when clicking edit:', pet);
    setEditingPet(pet);
    setIsFormOpen(true);
  };

  const handleClose = () => {
    setIsFormOpen(false);
    setEditingPet(null);
  };

  const handleDelete = async (id: string) => {
    deleteMutation.mutate(id);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <PawPrint className="h-8 w-8 text-primary/50" />
          <p className="text-muted-foreground">Loading pet profiles...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in w-full">
      <div className="flex flex-col items-center gap-4">
        <h2 className="text-2xl font-bold text-primary whitespace-nowrap">Pet Travel Wallet</h2>
        <Button 
          onClick={() => setIsFormOpen(true)}
          className="bg-primary hover:bg-primary/90 text-white transition-colors w-full md:w-auto"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Pet
        </Button>
      </div>
      
      <div className="grid gap-6 w-full">
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
        <div className="text-center py-12 bg-accent/50 rounded-lg">
          <PawPrint className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
          <p className="text-muted-foreground">
            No pets added yet. Click the "Add Pet" button to get started.
          </p>
        </div>
      )}

      <PetProfileForm
        isOpen={isFormOpen}
        onClose={handleClose}
        initialData={editingPet}
      />
    </div>
  );
};
