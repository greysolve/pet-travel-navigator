import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface DocumentType {
  value: string;
  label: string;
}

interface PetDocumentUploadProps {
  documentTypes: DocumentType[];
  selectedDocumentType: string;
  onDocumentTypeChange: (value: string) => void;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  currentDocuments?: Record<string, string>;
  onDocumentDelete?: (documentType: string) => void;
}

export const PetDocumentUpload = ({
  documentTypes,
  selectedDocumentType,
  onDocumentTypeChange,
  onFileChange,
  currentDocuments = {},
  onDocumentDelete,
}: PetDocumentUploadProps) => {
  const { toast } = useToast();

  const handleDeleteDocument = async (documentType: string) => {
    try {
      const documentUrl = currentDocuments[documentType];
      if (!documentUrl) return;

      // Extract the file path from the URL
      const path = documentUrl.split('/').slice(-3).join('/'); // Gets "userId/petId/filename"
      
      const { error } = await supabase.storage
        .from('pet-documents')
        .remove([path]);

      if (error) {
        console.error('Error deleting document:', error);
        toast({
          title: "Error",
          description: "Failed to delete document. Please try again.",
          variant: "destructive",
        });
        return;
      }

      if (onDocumentDelete) {
        onDocumentDelete(documentType);
      }

      toast({
        title: "Success",
        description: "Document deleted successfully",
      });
    } catch (error) {
      console.error('Error in handleDeleteDocument:', error);
      toast({
        title: "Error",
        description: "Failed to delete document. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="documentType">Document Type</Label>
        <Select value={selectedDocumentType} onValueChange={onDocumentTypeChange}>
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
          onChange={onFileChange}
          className="border-gray-400"
          accept=".pdf,.jpg,.jpeg,.png"
        />
      </div>

      {Object.entries(currentDocuments).length > 0 && (
        <div className="space-y-2">
          <Label>Current Documents</Label>
          <div className="space-y-2">
            {Object.entries(currentDocuments).map(([type, url]) => (
              <div key={type} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                <span className="text-sm">
                  {documentTypes.find(dt => dt.value === type)?.label || type}
                </span>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={() => handleDeleteDocument(type)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
