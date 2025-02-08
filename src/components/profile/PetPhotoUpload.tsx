
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { X } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/lib/supabase";

interface PetPhotoUploadProps {
  photoUrls: string[];
  onPhotoUrlsChange: (urls: string[]) => void;
  photos: File[];
  onPhotosChange: (photos: File[]) => void;
}

export const PetPhotoUpload = ({ 
  photoUrls, 
  onPhotoUrlsChange, 
  photos, 
  onPhotosChange 
}: PetPhotoUploadProps) => {
  const { toast } = useToast();

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
      onPhotosChange([...photos, ...newPhotos]);
    }
  };

  const removePhoto = (index: number) => {
    onPhotosChange(photos.filter((_, i) => i !== index));
  };

  const removeExistingPhoto = async (url: string) => {
    try {
      // Extract the file path from the URL
      const path = url.split('/').slice(-2).join('/'); // Gets "userId/filename"
      
      const { error } = await supabase.storage
        .from('pet-photos')
        .remove([path]);

      if (error) {
        console.error('Error deleting photo:', error);
        toast({
          title: "Error",
          description: "Failed to delete photo. Please try again.",
          variant: "destructive",
        });
        return;
      }

      onPhotoUrlsChange(photoUrls.filter(photoUrl => photoUrl !== url));
      toast({
        title: "Success",
        description: "Photo deleted successfully",
      });
    } catch (error) {
      console.error('Error in removeExistingPhoto:', error);
      toast({
        title: "Error",
        description: "Failed to delete photo. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-2">
      <Label>Pet Photos (up to 4)</Label>
      <div className="grid grid-cols-2 gap-4">
        {photoUrls.map((url) => (
          <div key={url} className="relative">
            <img 
              src={url} 
              alt="Pet photo" 
              className="w-full h-32 object-cover rounded-md"
            />
            <Button
              type="button"
              variant="destructive"
              size="icon"
              className="absolute top-1 right-1 h-6 w-6"
              onClick={() => removeExistingPhoto(url)}
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
  );
};
