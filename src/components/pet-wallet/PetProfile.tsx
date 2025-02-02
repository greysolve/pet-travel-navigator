import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ImageUpload } from "./ImageUpload";
import { DocumentUpload } from "./DocumentUpload";
import { EditPetDialog } from "./EditPetDialog";
import { Pencil, Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/use-toast";

interface PetProfileProps {
  pet: any;
  onUpdate: () => void;
}

export const PetProfile = ({ pet, onUpdate }: PetProfileProps) => {
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  const handleDelete = async () => {
    try {
      const { error } = await supabase
        .from("pet_profiles")
        .delete()
        .eq("id", pet.id);

      if (error) throw error;

      toast({
        title: "Pet profile deleted",
        description: "The pet profile has been successfully deleted.",
      });
      onUpdate();
    } catch (error) {
      console.error("Error deleting pet:", error);
      toast({
        title: "Error",
        description: "Failed to delete pet profile",
        variant: "destructive",
      });
    }
    setIsDeleteOpen(false);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <CardTitle className="text-xl font-medium">{pet.name}</CardTitle>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setIsEditOpen(true)}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setIsDeleteOpen(true)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2">
          <p className="text-sm font-medium">Type: {pet.type}</p>
          {pet.breed && <p className="text-sm">Breed: {pet.breed}</p>}
          {pet.chip_number && (
            <p className="text-sm">Microchip Number: {pet.chip_number}</p>
          )}
          {pet.chip_authority && (
            <p className="text-sm">
              Microchip Registration: {pet.chip_authority}
            </p>
          )}
        </div>

        <ImageUpload petId={pet.id} images={pet.images || []} onUpdate={onUpdate} />
        <DocumentUpload pet={pet} onUpdate={onUpdate} />

        <EditPetDialog
          pet={pet}
          open={isEditOpen}
          onOpenChange={setIsEditOpen}
          onSuccess={onUpdate}
        />

        <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Pet Profile</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete {pet.name}'s profile? This action
                cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
};