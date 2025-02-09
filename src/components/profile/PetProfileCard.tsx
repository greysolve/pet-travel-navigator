
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Database } from "@/integrations/supabase/types";
import { PawPrint, Trash, ImageIcon } from "lucide-react";
import type { PetProfileMode } from "./types/pet-profile.types";

type PetProfile = Database['public']['Tables']['pet_profiles']['Row'];

interface PetProfileCardProps {
  pet: PetProfile;
  mode?: PetProfileMode;
  onView?: (pet: PetProfile) => void;
  onDelete?: (id: string) => void;
}

export const PetProfileCard = ({ 
  pet, 
  mode = 'default',
  onView, 
  onDelete,
}: PetProfileCardProps) => {
  const thumbnailUrl = pet.images?.[0];
  
  const handleCardClick = (e: React.MouseEvent) => {
    // Don't trigger view mode if clicking delete button
    if ((e.target as HTMLElement).closest('button')) return;
    onView?.(pet);
  };
  
  return (
    <Card 
      className="group hover:shadow-lg transition-all duration-300 hover:-translate-y-1 bg-gradient-to-br from-white to-accent/10 md:w-[60%] w-full mx-auto cursor-pointer"
      onClick={handleCardClick}
    >
      <div className="flex items-start p-4 gap-4">
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
              <ImageIcon className="h-8 w-8 text-muted-foreground/50" />
            )}
          </div>
        </div>

        {/* Pet Name and Actions Section */}
        <div className="flex-shrink-0 flex flex-col gap-2">
          <CardTitle className="text-xl font-bold flex items-center gap-2 text-primary">
            {pet.name}
            <PawPrint className="h-5 w-5" />
          </CardTitle>
          
          {mode === 'default' && onDelete && (
            <div className="opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(pet.id);
                }}
                className="hover:bg-destructive/10 hover:text-destructive"
              >
                <Trash className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>

        {/* Info Section */}
        <div className="ml-auto text-right space-y-1">
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
      </div>
    </Card>
  );
};
