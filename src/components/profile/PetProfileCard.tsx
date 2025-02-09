import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Database } from "@/integrations/supabase/types";
import { PawPrint, Pencil, Trash } from "lucide-react";

type PetProfile = Database['public']['Tables']['pet_profiles']['Row'];

interface PetProfileCardProps {
  pet: PetProfile;
  onEdit: (pet: PetProfile) => void;
  onDelete: (id: string) => void;
}

export const PetProfileCard = ({ pet, onEdit, onDelete }: PetProfileCardProps) => {
  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-xl font-bold flex items-center gap-2">
          <PawPrint className="h-5 w-5" />
          {pet.name}
        </CardTitle>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onEdit(pet)}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onDelete(pet.id)}
          >
            <Trash className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-2">
          <div className="text-sm">
            <span className="font-medium">Type:</span> {pet.type}
          </div>
          {pet.breed && (
            <div className="text-sm">
              <span className="font-medium">Breed:</span> {pet.breed}
            </div>
          )}
          {pet.age && (
            <div className="text-sm">
              <span className="font-medium">Age:</span> {pet.age} years
            </div>
          )}
          {pet.weight && (
            <div className="text-sm">
              <span className="font-medium">Weight:</span> {pet.weight} kg
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};