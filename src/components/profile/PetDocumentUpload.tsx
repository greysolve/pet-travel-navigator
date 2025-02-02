import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface DocumentType {
  value: string;
  label: string;
}

interface PetDocumentUploadProps {
  documentTypes: DocumentType[];
  selectedDocumentType: string;
  onDocumentTypeChange: (value: string) => void;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const PetDocumentUpload = ({
  documentTypes,
  selectedDocumentType,
  onDocumentTypeChange,
  onFileChange,
}: PetDocumentUploadProps) => {
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
    </div>
  );
};