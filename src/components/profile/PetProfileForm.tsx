
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
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { Database } from "@/integrations/supabase/types";
import { documentTypes } from "./types/pet-profile.types";
import { Loader2, Pencil, Save } from "lucide-react";

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
  const [isEditMode, setIsEditMode] = useState(false);

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
    // Reset edit mode when form is opened/closed
    setIsEditMode(false);
  }, [initialData, isOpen]);

  // Create current documents object from pet profile data
  const getCurrentDocuments = () => {
    if (!initialData) return {};
    
    const documents: Record<string, string> = {};
    
    // Map database fields to document types
    if (initialData.health_certificate_url) {
      documents.health_certificate = initialData.health_certificate_url;
    }
    if (initialData.international_health_certificate_url) {
      documents.international_health_certificate = initialData.international_health_certificate_url;
    }
    if (initialData.microchip_documentation_url) {
      documents.microchip_documentation = initialData.microchip_documentation_url;
    }
    if (initialData.pet_passport_url) {
      documents.pet_passport = initialData.pet_passport_url;
    }
    if (initialData.rabies_vaccination_url) {
      documents.rabies_vaccination = initialData.rabies_vaccination_url;
    }
    if (initialData.vaccinations_url) {
      documents.vaccinations = initialData.vaccinations_url;
    }
    if (initialData.usda_endorsement_url) {
      documents.usda_endorsement = initialData.usda_endorsement_url;
    }
    if (initialData.veterinary_certificate_url) {
      documents.veterinary_certificate = initialData.veterinary_certificate_url;
    }
    
    return documents;
  };

  const handleDocumentDelete = async (documentType: string) => {
    if (!initialData?.id) return;

    try {
      const updateData = {
        [`${documentType}_url`]: null
      };

      const { error } = await supabase
        .from('pet_profiles')
        .update(updateData)
        .eq('id', initialData.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Document deleted successfully",
      });

      // Refresh the data
      queryClient.invalidateQueries({ queryKey: ['pet-profiles'] });
    } catch (error) {
      console.error('Error deleting document:', error);
      toast({
        title: "Error",
        description: "Failed to delete document. Please try again.",
        variant: "destructive",
      });
    }
  };

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
      setIsEditMode(false);
      if (!initialData) onClose(); // Only close if it's a new pet
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

  const handleEdit = () => {
    if (isEditMode) {
      // If in edit mode, trigger form submission
      const form = document.getElementById('pet-profile-form') as HTMLFormElement;
      if (form) {
        form.requestSubmit();
      }
    } else {
      // If in view mode, enter edit mode
      setIsEditMode(true);
    }
  };

  const handleCancel = () => {
    if (initialData) {
      // Reset form to initial data
      setName(initialData.name || '');
      setType(initialData.type || '');
      setBreed(initialData.breed || '');
      setAge(initialData.age?.toString() || '');
      setWeight(initialData.weight?.toString() || '');
      setPhotoUrls(initialData.images || []);
      setIsEditMode(false);
    } else {
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {initialData 
              ? isEditMode 
                ? 'Edit Pet Profile'
                : initialData.name
              : 'Add Pet Profile'}
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
              readOnly={!isEditMode && viewMode}
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
              readOnly={!isEditMode && viewMode}
            />

            <PetDocumentUpload
              documentTypes={documentTypes}
              selectedDocumentType={selectedDocumentType}
              onDocumentTypeChange={setSelectedDocumentType}
              onFileChange={(e) => console.log('File selected:', e.target.files?.[0])}
              currentDocuments={getCurrentDocuments()}
              onDocumentDelete={handleDocumentDelete}
              readOnly={!isEditMode && viewMode}
            />
          </form>
        </div>

        <DialogFooter className="mt-6">
          {viewMode ? (
            isEditMode ? (
              <>
                <Button type="button" variant="outline" onClick={handleCancel}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleEdit}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Save Changes
                    </>
                  )}
                </Button>
              </>
            ) : (
              <>
                <Button type="button" variant="outline" onClick={onClose}>
                  Close
                </Button>
                <Button onClick={handleEdit} type="button">
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit
                </Button>
              </>
            )
          ) : (
            <>
              <Button type="button" variant="outline" onClick={handleCancel}>
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
                    {initialData ? 'Saving...' : 'Adding...'}
                  </>
                ) : (
                  <>
                    {initialData && <Save className="mr-2 h-4 w-4" />}
                    {initialData ? 'Save Changes' : 'Add Pet'}
                  </>
                )}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
