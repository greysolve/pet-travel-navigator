
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
import { documentTypes } from "./types/pet-profile.types";
import { usePetProfileForm } from "./hooks/usePetProfileForm";

interface PetProfileFormProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: any;
}

export const PetProfileForm = ({ isOpen, onClose, initialData }: PetProfileFormProps) => {
  console.log('PetProfileForm render with initialData:', initialData);
  
  const {
    name,
    type,
    breed,
    age,
    weight,
    selectedDocumentType,
    photos,
    photoUrls,
    isUploading,
    setName,
    setType,
    setBreed,
    setAge,
    setWeight,
    setSelectedDocumentType,
    setFile,
    setPhotos,
    setPhotoUrls,
    handleSubmit
  } = usePetProfileForm(initialData, onClose);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{initialData ? 'Edit' : 'Add'} Pet Profile</DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto px-1">
          <form id="pet-profile-form" onSubmit={handleSubmit} className="space-y-6">
            <PetPhotoUpload
              photoUrls={photoUrls}
              onPhotoUrlsChange={setPhotoUrls}
              photos={photos}
              onPhotosChange={setPhotos}
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
            />

            <PetDocumentUpload
              documentTypes={documentTypes}
              selectedDocumentType={selectedDocumentType}
              onDocumentTypeChange={setSelectedDocumentType}
              onFileChange={setFile}
            />
          </form>
        </div>

        <DialogFooter className="mt-6">
          <Button type="button" variant="outline" onClick={onClose} disabled={isUploading}>
            Cancel
          </Button>
          <Button type="submit" form="pet-profile-form" disabled={isUploading}>
            {isUploading ? 'Uploading...' : initialData ? 'Update' : 'Add'} Pet
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
