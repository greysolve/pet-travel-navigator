import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/ui/use-toast";
import { Database } from "@/integrations/supabase/types";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { X } from "lucide-react";

type PetProfile = Database['public']['Tables']['pet_profiles']['Row'];

interface PetProfileFormProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: PetProfile;
}

const documentTypes = [
  { value: "health_certificate", label: "Health Certificate" },
  { value: "international_health_certificate", label: "International Health Certificate" },
  { value: "microchip_documentation", label: "Microchip Documentation" },
  { value: "pet_passport", label: "Pet Passport" },
  { value: "rabies_vaccination", label: "Rabies Vaccination" },
  { value: "vaccinations", label: "Vaccinations" },
  { value: "usda_endorsement", label: "USDA Endorsement" },
  { value: "veterinary_certificate", label: "Veterinary Certificate" }
];

export const PetProfileForm = ({ isOpen, onClose, initialData }: PetProfileFormProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [name, setName] = useState(initialData?.name || "");
  const [type, setType] = useState(initialData?.type || "");
  const [breed, setBreed] = useState(initialData?.breed || "");
  const [age, setAge] = useState(initialData?.age?.toString() || "");
  const [weight, setWeight] = useState(initialData?.weight?.toString() || "");
  const [selectedDocumentType, setSelectedDocumentType] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [photos, setPhotos] = useState<File[]>([]);
  const [photoUrls, setPhotoUrls] = useState<string[]>(initialData?.images || []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newPhotos = Array.from(e.target.files);
      if (photos.length + newPhotos.length > 4) {
        toast({
          title: "Maximum photos reached",
          description: "You can only upload up to 4 photos",
          variant: "destructive",
        });
        return;
      }
      setPhotos([...photos, ...newPhotos]);
    }
  };

  const removePhoto = (index: number) => {
    setPhotos(photos.filter((_, i) => i !== index));
  };

  const removeExistingPhoto = (index: number) => {
    setPhotoUrls(photoUrls.filter((_, i) => i !== index));
  };

  const uploadPhotos = async (petId: string) => {
    const uploadedUrls: string[] = [...photoUrls];

    for (const photo of photos) {
      const fileExt = photo.name.split('.').pop();
      const filePath = `${petId}/${crypto.randomUUID()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('pet-documents')
        .upload(filePath, photo);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('pet-documents')
        .getPublicUrl(filePath);

      uploadedUrls.push(publicUrl);
    }

    return uploadedUrls;
  };

  const uploadFile = async (petId: string) => {
    if (!file || !selectedDocumentType) return null;

    const fileExt = file.name.split('.').pop();
    const filePath = `${petId}/${selectedDocumentType}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('pet-documents')
      .upload(filePath, file);

    if (uploadError) {
      throw uploadError;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('pet-documents')
      .getPublicUrl(filePath);

    const updateData = {
      [`${selectedDocumentType}_url`]: publicUrl
    };

    const { error: updateError } = await supabase
      .from('pet_profiles')
      .update(updateData)
      .eq('id', petId);

    if (updateError) {
      throw updateError;
    }
  };

  const mutation = useMutation({
    mutationFn: async (data: Partial<PetProfile>) => {
      const { data: result, error } = initialData
        ? await supabase
            .from('pet_profiles')
            .update(data)
            .eq('id', initialData.id)
            .select()
            .single()
        : await supabase
            .from('pet_profiles')
            .insert([data])
            .select()
            .single();

      if (error) throw error;

      if (photos.length > 0) {
        const uploadedUrls = await uploadPhotos(result.id);
        const { error: updateError } = await supabase
          .from('pet_profiles')
          .update({ images: uploadedUrls })
          .eq('id', result.id);

        if (updateError) throw updateError;
      }

      if (file && selectedDocumentType) {
        await uploadFile(result.id);
      }

      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pet-profiles'] });
      toast({
        title: `Pet profile ${initialData ? 'updated' : 'created'} successfully`,
        description: `Your pet's profile has been ${initialData ? 'updated' : 'created'}.`,
      });
      onClose();
    },
    onError: (error) => {
      console.error('Error saving pet profile:', error);
      toast({
        title: "Error",
        description: `Failed to ${initialData ? 'update' : 'create'} pet profile. Please try again.`,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const data: Partial<PetProfile> = {
      name,
      type,
      breed: breed || null,
      age: age ? parseFloat(age) : null,
      weight: weight ? parseFloat(weight) : null,
      images: photoUrls,
    };

    mutation.mutate(data);
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{initialData ? 'Edit' : 'Add'} Pet Profile</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Pet Photos (up to 4)</Label>
            <div className="grid grid-cols-2 gap-4">
              {photoUrls.map((url, index) => (
                <div key={url} className="relative">
                  <img 
                    src={url} 
                    alt={`Pet photo ${index + 1}`} 
                    className="w-full h-32 object-cover rounded-md"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute top-1 right-1 h-6 w-6"
                    onClick={() => removeExistingPhoto(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              {photos.map((photo, index) => (
                <div key={index} className="relative">
                  <img 
                    src={URL.createObjectURL(photo)} 
                    alt={`New pet photo ${index + 1}`} 
                    className="w-full h-32 object-cover rounded-md"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute top-1 right-1 h-6 w-6"
                    onClick={() => removePhoto(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              {photoUrls.length + photos.length < 4 && (
                <div className="flex items-center justify-center border-2 border-dashed border-gray-300 rounded-md h-32">
                  <Input
                    type="file"
                    onChange={handlePhotoUpload}
                    accept="image/*"
                    className="hidden"
                    id="photo-upload"
                    multiple
                  />
                  <Label htmlFor="photo-upload" className="cursor-pointer text-sm text-gray-600">
                    + Add Photo
                  </Label>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Pet's name"
              required
              className="border-gray-400"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="type">Type *</Label>
            <Select value={type} onValueChange={setType} required>
              <SelectTrigger className="border-gray-400">
                <SelectValue placeholder="Select pet type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="dog">Dog</SelectItem>
                <SelectItem value="cat">Cat</SelectItem>
                <SelectItem value="bird">Bird</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="breed">Breed</Label>
            <Input
              id="breed"
              value={breed}
              onChange={(e) => setBreed(e.target.value)}
              placeholder="Pet's breed"
              className="border-gray-400"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="age">Age (years)</Label>
              <Input
                id="age"
                type="number"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                placeholder="Age in years"
                min="0"
                step="0.1"
                className="border-gray-400"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="weight">Weight (kg)</Label>
              <Input
                id="weight"
                type="number"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                placeholder="Weight in kg"
                min="0"
                step="0.1"
                className="border-gray-400"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="documentType">Document Type</Label>
            <Select value={selectedDocumentType} onValueChange={setSelectedDocumentType}>
              <SelectTrigger className="border-gray-400">
                <SelectValue placeholder="Select document type" />
              </SelectTrigger>
              <SelectContent>
                {documentTypes.map((docType) => (
                  <SelectItem key={docType.value} value={docType.value}>
                    {docType.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="file">Upload Document</Label>
            <Input
              id="file"
              type="file"
              onChange={handleFileChange}
              className="border-gray-400"
              accept=".pdf,.jpg,.jpeg,.png"
            />
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">
              {initialData ? 'Update' : 'Add'} Pet
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};