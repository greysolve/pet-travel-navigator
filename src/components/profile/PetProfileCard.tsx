
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Database } from "@/integrations/supabase/types";
import { PawPrint, Pencil, Trash, ImageIcon } from "lucide-react";

type PetProfile = Database['public']['Tables']['pet_profiles']['Row'];

interface PetProfileCardProps {
  pet: PetProfile;
  onEdit: (pet: PetProfile) => void;
  onDelete: (id: string) => void;
}

export const PetProfileCard = ({ pet, onEdit, onDelete }: PetProfileCardProps) => {
  const thumbnailUrl = pet.images?.[0];
  
  return (
    <Card className="group hover:shadow-lg transition-all duration-300 hover:-translate-y-1 bg-gradient-to-br from-white to-accent/10 md:w-[60%] w-full mx-auto">
      <div className="flex items-center p-4">
        {/* Thumbnail Section */}
        <div className="flex-shrink-0">
          <div className="w-[120px] h-[120px] rounded-lg overflow-hidden bg-accent/20 flex items-center justify-center">
            {thumbnailUrl ? (
              <img 
                src={thumbnailUrl} 
                alt={`${pet.name}'s photo`}
                className="w-full h-full object-cover"
              />
            ) : (
              <ImageIcon className="w-8 h-8 text-muted-foreground/50" />
            )}
          </div>
        </div>

        {/* Pet Name Section */}
        <div className="ml-4 flex-shrink-0">
          <CardTitle className="text-xl font-bold flex items-center gap-2 text-primary">
            {pet.name}
            <PawPrint className="h-5 w-5" />
          </CardTitle>
        </div>

        {/* Info Section */}
        <div className="ml-auto flex-grow flex flex-col items-end gap-1 text-right">
          <div className="text-lg">
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

        {/* Actions Section */}
        <div className="ml-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
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
      </div>
    </Card>
  );
};
