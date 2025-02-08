
import { Button } from "@/components/ui/button";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogFooter 
} from "@/components/ui/dialog";
import { PetPhotoUpload } from "./PetPhotoUpload";
import { PetDocumentUpload } from "./PetDocumentUpload";
import { PetBasicInfo } from "./PetBasicInfo";
import { useState, useEffect } from "react";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/lib/supabase";
import { useQueryClient } from "@tanstack/react-query";
import { Database } from "@/integrations/supabase/types";
import { documentTypes } from "./types/pet-profile.types";
import { Loader2, Pencil } from "lucide-react";

type PetProfile = Database['public']['Tables']['pet_profiles']['Row'];

interface PetProfileFormProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: PetProfile | null;
  viewMode?: boolean;
  onEdit?: () => void;
}

export const PetProfileForm = ({ 
  isOpen, 
  onClose, 
  initialData,
  viewMode = false,
  onEdit 
}: PetProfileFormProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Form state
  const [name, setName] = useState('');
  const [type, setType] = useState('');
  const [breed, setBreed] = useState('');
  const [age, setAge] = useState('');
  const [weight, setWeight] = useState('');
  const [selectedDocumentType, setSelectedDocumentType] = useState("");
  const [photos, setPhotos] = useState<File[]>([]);
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Use useEffect to update form state when initialData changes
  useEffect(() => {
    if (initialData) {
      setName(initialData.name || '');
      setType(initialData.type || '');
      setBreed(initialData.breed || '');
      setAge(initialData.age?.toString() || '');
      setWeight(initialData.weight?.toString() || '');
      setPhotoUrls(initialData.images || []);
    } else {
      // Reset form when adding new pet
      setName('');
      setType('');
      setBreed('');
      setAge('');
      setWeight('');
      setPhotoUrls([]);
    }
  }, [initialData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) throw new Error("User must be authenticated");

      const petData = {
        name,
        type,
        breed: breed || null,
        age: age ? parseFloat(age) : null,
        weight: weight ? parseFloat(weight) : null,
        images: photoUrls,
        user_id: user.id,
      };

      if (initialData?.id) {
        // Update existing pet
        const { error } = await supabase
          .from('pet_profiles')
          .update(petData)
          .eq('id', initialData.id);

        if (error) throw error;
        
        toast({
          title: "Success",
          description: "Pet profile updated successfully",
        });
      } else {
        // Create new pet
        const { error } = await supabase
          .from('pet_profiles')
          .insert([petData]);

        if (error) throw error;
        
        toast({
          title: "Success",
          description: "Pet profile created successfully",
        });
      }

      queryClient.invalidateQueries({ queryKey: ['pet-profiles'] });
      onClose();
    } catch (error) {
      console.error('Error saving pet profile:', error);
      toast({
        title: "Error",
        description: "Failed to save pet profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {viewMode ? initialData?.name : (initialData ? 'Edit' : 'Add') + ' Pet Profile'}
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto px-1">
          <form id="pet-profile-form" onSubmit={handleSubmit} className="space-y-6">
            <PetPhotoUpload
              photoUrls={photoUrls}
              onPhotoUrlsChange={setPhotoUrls}
              photos={photos}
              onPhotosChange={setPhotos}
              petId={initialData?.id}
              readOnly={viewMode}
            />

            <PetBasicInfo
              name={name}
              type={type}
              breed={breed}
              age={age}
              weight={weight}
              onNameChange={setName}
              onTypeChange={setType}
              onBreedChange={setBreed}
              onAgeChange={setAge}
              onWeightChange={setWeight}
              readOnly={viewMode}
            />

            {!viewMode && (
              <PetDocumentUpload
                documentTypes={documentTypes}
                selectedDocumentType={selectedDocumentType}
                onDocumentTypeChange={setSelectedDocumentType}
                onFileChange={(e) => console.log('File selected:', e.target.files?.[0])}
              />
            )}
          </form>
        </div>

        <DialogFooter className="mt-6">
          {viewMode ? (
            <>
              <Button type="button" variant="outline" onClick={onClose}>
                Close
              </Button>
              {onEdit && (
                <Button onClick={onEdit} type="button">
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit
                </Button>
              )}
            </>
          ) : (
            <>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                form="pet-profile-form"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {initialData ? 'Updating...' : 'Adding...'}
                  </>
                ) : (
                  initialData ? 'Update Pet' : 'Add Pet'
                )}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
