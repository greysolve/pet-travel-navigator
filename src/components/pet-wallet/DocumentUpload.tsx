import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FileUp, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/use-toast";

interface DocumentUploadProps {
  pet: any;
  onUpdate: () => void;
}

const documentTypes = [
  { key: "health_certificate_url", label: "Health Certificate" },
  { key: "international_health_certificate_url", label: "International Health Certificate" },
  { key: "microchip_documentation_url", label: "Microchip Documentation" },
  { key: "pet_passport_url", label: "Pet Passport" },
  { key: "rabies_vaccination_url", label: "Rabies Vaccination" },
  { key: "vaccinations_url", label: "Vaccinations" },
  { key: "usda_endorsement_url", label: "USDA Endorsement" },
  { key: "veterinary_certificate_url", label: "Veterinary Certificate" },
];

export const DocumentUpload = ({ pet, onUpdate }: DocumentUploadProps) => {
  const [uploading, setUploading] = useState<string | null>(null);
  const fileInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});

  const handleDocumentUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
    documentType: string
  ) => {
    try {
      setUploading(documentType);
      
      if (!event.target.files || event.target.files.length === 0) {
        throw new Error("Please select a document to upload.");
      }

      const file = event.target.files[0];
      const fileExt = file.name.split(".").pop();
      const filePath = `${pet.id}/documents/${documentType}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("pet-documents")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("pet-documents")
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from("pet_profiles")
        .update({
          [documentType]: publicUrl,
        })
        .eq("id", pet.id);

      if (updateError) throw updateError;

      toast({
        title: "Document uploaded",
        description: "Your pet's document has been uploaded successfully.",
      });

      onUpdate();
    } catch (error: any) {
      console.error("Error uploading document:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to upload document.",
        variant: "destructive",
      });
    } finally {
      setUploading(null);
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="font-medium">Travel Documents</h3>
      <div className="grid gap-4 md:grid-cols-2">
        {documentTypes.map(({ key, label }) => (
          <div key={key} className="space-y-2">
            <Label>{label}</Label>
            <div className="flex gap-2">
              <Input
                ref={(el) => (fileInputRefs.current[key] = el)}
                type="file"
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                onChange={(e) => handleDocumentUpload(e, key)}
                className="hidden"
                disabled={uploading === key}
              />
              <Button
                onClick={() => fileInputRefs.current[key]?.click()}
                disabled={uploading === key}
                variant="outline"
                className="flex-1"
              >
                <FileUp className="h-4 w-4 mr-2" />
                {uploading === key ? "Uploading..." : "Upload"}
              </Button>
              {pet[key] && (
                <Button
                  variant="outline"
                  size="icon"
                  asChild
                >
                  <a href={pet[key]} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};