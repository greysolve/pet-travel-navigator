import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ImagePlus, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/use-toast";

interface ImageUploadProps {
  petId: string;
  images: string[];
  onUpdate: () => void;
}

export const ImageUpload = ({ petId, images, onUpdate }: ImageUploadProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);
      
      if (!event.target.files || event.target.files.length === 0) {
        throw new Error("Please select an image to upload.");
      }

      if (images.length >= 4) {
        throw new Error("Maximum of 4 images allowed.");
      }

      const file = event.target.files[0];
      const fileExt = file.name.split(".").pop();
      const filePath = `${petId}/${Math.random()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("pet-images")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("pet-images")
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from("pet_profiles")
        .update({
          images: [...images, publicUrl],
        })
        .eq("id", petId);

      if (updateError) throw updateError;

      toast({
        title: "Image uploaded",
        description: "Your pet's image has been uploaded successfully.",
      });

      onUpdate();
    } catch (error: any) {
      console.error("Error uploading image:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to upload image.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveImage = async (imageUrl: string) => {
    try {
      const updatedImages = images.filter((url) => url !== imageUrl);
      
      const { error } = await supabase
        .from("pet_profiles")
        .update({
          images: updatedImages,
        })
        .eq("id", petId);

      if (error) throw error;

      toast({
        title: "Image removed",
        description: "The image has been removed successfully.",
      });

      onUpdate();
    } catch (error) {
      console.error("Error removing image:", error);
      toast({
        title: "Error",
        description: "Failed to remove image.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {images.map((url, index) => (
          <div key={index} className="relative group">
            <img
              src={url}
              alt={`Pet ${index + 1}`}
              className="w-full h-32 object-cover rounded-lg"
            />
            <button
              onClick={() => handleRemoveImage(url)}
              className="absolute top-2 right-2 p-1 bg-red-500 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
        {images.length < 4 && (
          <div className="flex items-center justify-center">
            <Input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
              disabled={uploading}
            />
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              variant="outline"
              className="w-full h-32 flex flex-col items-center justify-center gap-2"
            >
              <ImagePlus className="h-6 w-6" />
              <span className="text-sm">Add Photo</span>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};