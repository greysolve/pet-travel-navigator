
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/components/ui/use-toast";
import { PetProfile } from "../types/pet-profile.types";

export const usePetProfileForm = (
  initialData: PetProfile | undefined,
  onClose: () => void
) => {
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

  const uploadPhotos = async () => {
    try {
      const uploadedUrls: string[] = [];
      console.log('Starting photo upload process...');

      // Upload each new photo
      for (const photo of photos) {
        const fileExt = photo.name.split('.').pop();
        const fileName = `${crypto.randomUUID()}.${fileExt}`;
        console.log(`Uploading photo: ${fileName}`);

        const { error: uploadError, data } = await supabase.storage
          .from('pet-photos')
          .upload(fileName, photo);

        if (uploadError) {
          console.error('Error uploading photo:', uploadError);
          throw uploadError;
        }

        const { data: { publicUrl } } = supabase.storage
          .from('pet-photos')
          .getPublicUrl(fileName);

        uploadedUrls.push(publicUrl);
        console.log(`Successfully uploaded photo: ${publicUrl}`);
      }

      // Combine existing URLs with new ones
      const allUrls = [...photoUrls, ...uploadedUrls];
      console.log('Final photo URLs:', allUrls);
      return allUrls;
    } catch (error) {
      console.error('Error in uploadPhotos:', error);
      throw error;
    }
  };

  const uploadFile = async (petId: string) => {
    if (!file || !selectedDocumentType) return null;

    const fileExt = file.name.split('.').pop();
    const filePath = `${petId}/${selectedDocumentType}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('pet-documents')
      .upload(filePath, file);

    if (uploadError) throw uploadError;

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

    if (updateError) throw updateError;
  };

  const mutation = useMutation({
    mutationFn: async (data: Partial<PetProfile>) => {
      console.log('Starting mutation process...');
      
      // Get the current user's ID
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) throw new Error("User must be authenticated to create/edit pet profiles");

      // Upload photos first if there are any new ones
      let finalPhotoUrls = photoUrls;
      if (photos.length > 0) {
        console.log('New photos detected, uploading...');
        finalPhotoUrls = await uploadPhotos();
      }

      // Prepare the data with the final photo URLs
      const dataWithPhotos = {
        ...data,
        images: finalPhotoUrls,
        user_id: user.id
      };

      console.log('Updating database with data:', dataWithPhotos);

      // Update or create the pet profile
      const { data: result, error } = initialData
        ? await supabase
            .from('pet_profiles')
            .update(dataWithPhotos)
            .eq('id', initialData.id)
            .select()
            .single()
        : await supabase
            .from('pet_profiles')
            .insert([dataWithPhotos])
            .select()
            .single();

      if (error) {
        console.error('Database operation failed:', error);
        throw error;
      }

      // Handle document upload if needed
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
    console.log('Form submitted with photos:', photos.length, 'new photos');
    
    const data: Partial<PetProfile> = {
      name,
      type,
      breed: breed || null,
      age: age ? parseFloat(age) : null,
      weight: weight ? parseFloat(weight) : null,
    };

    mutation.mutate(data);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  return {
    name,
    type,
    breed,
    age,
    weight,
    selectedDocumentType,
    file,
    photos,
    photoUrls,
    setName,
    setType,
    setBreed,
    setAge,
    setWeight,
    setSelectedDocumentType,
    setFile: handleFileChange,
    setPhotos,
    setPhotoUrls,
    handleSubmit
  };
};
