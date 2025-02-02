import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { X } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

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

  const removeExistingPhoto = (index: number) => {
    onPhotoUrlsChange(photoUrls.filter((_, i) => i !== index));
  };

  return (
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
  );
};