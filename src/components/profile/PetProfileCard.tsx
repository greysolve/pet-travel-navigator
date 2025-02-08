
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
    <Card className="group hover:shadow-lg transition-all duration-300 hover:-translate-y-1 bg-gradient-to-br from-white to-accent/10">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-xl font-bold flex items-center gap-2 text-primary">
          <PawPrint className="h-5 w-5" />
          {pet.name}
        </CardTitle>
        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onEdit(pet)}
            className="hover:bg-accent"
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onDelete(pet.id)}
            className="hover:bg-destructive/10 hover:text-destructive"
          >
            <Trash className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-2">
          <div className="text-sm">
            <span className="font-medium text-muted-foreground">Type:</span>{" "}
            <span className="text-foreground capitalize">{pet.type}</span>
          </div>
          {pet.breed && (
            <div className="text-sm">
              <span className="font-medium text-muted-foreground">Breed:</span>{" "}
              <span className="text-foreground">{pet.breed}</span>
            </div>
          )}
          {pet.age && (
            <div className="text-sm">
              <span className="font-medium text-muted-foreground">Age:</span>{" "}
              <span className="text-foreground">{pet.age} years</span>
            </div>
          )}
          {pet.weight && (
            <div className="text-sm">
              <span className="font-medium text-muted-foreground">Weight:</span>{" "}
              <span className="text-foreground">{pet.weight} kg</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
