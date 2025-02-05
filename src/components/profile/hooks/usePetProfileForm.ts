
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
      // Get the current user's ID
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) throw new Error("User must be authenticated to create/edit pet profiles");

      // Add the user_id to the data
      const dataWithUserId = {
        ...data,
        user_id: user.id
      };

      const { data: result, error } = initialData
        ? await supabase
            .from('pet_profiles')
            .update(data)
            .eq('id', initialData.id)
            .select()
            .single()
        : await supabase
            .from('pet_profiles')
            .insert([dataWithUserId])
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
