
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface ContactInformationProps {
  fullName: string;
  email?: string;
  onFullNameChange: (value: string) => void;
}

export const ContactInformation = ({
  fullName,
  email,
  onFullNameChange,
}: ContactInformationProps) => {
  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-primary text-center">Contact Information</h3>
      <div className="space-y-4">
        <div className="space-y-2">
          <Label className="text-sm font-medium text-gray-700">Full Name</Label>
          <Input
            value={fullName}
            onChange={(e) => onFullNameChange(e.target.value)}
            placeholder="Enter your full name"
            className="w-full border-gray-400"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-sm font-medium text-gray-700">Email</Label>
          <Input value={email} disabled className="bg-gray-50 border-gray-400" />
        </div>
      </div>
    </div>
  );
};
