
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
    <Card className="group hover:shadow-lg transition-all duration-300 hover:-translate-y-1 bg-gradient-to-br from-white to-accent/10">
      <div className="flex flex-col md:flex-row md:items-center py-4">
        {/* Thumbnail Section */}
        <div className="px-4 flex items-center justify-center md:justify-start flex-shrink-0">
          <div className="w-[200px] h-[200px] md:w-[150px] md:h-[150px] rounded-lg overflow-hidden bg-accent/20 flex items-center justify-center">
            {thumbnailUrl ? (
              <img 
                src={thumbnailUrl} 
                alt={`${pet.name}'s photo`}
                className="w-full h-full object-cover"
              />
            ) : (
              <ImageIcon className="w-12 h-12 text-muted-foreground/50" />
            )}
          </div>
        </div>

        {/* Content Section */}
        <div className="flex-grow px-4 md:px-0 flex flex-col justify-center">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xl font-bold flex items-center gap-2 text-primary mx-auto md:mx-0">
              {pet.name}
              <PawPrint className="h-5 w-5" />
            </CardTitle>
            <div className="flex gap-2 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
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
            <div className="grid gap-4 text-center md:text-right">
              <div className="text-2xl">
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
        </div>
      </div>
    </Card>
  );
};
