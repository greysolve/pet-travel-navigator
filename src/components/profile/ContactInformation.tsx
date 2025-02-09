import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface ContactInformationProps {
  firstName: string;
  lastName: string;
  email?: string;
  onFirstNameChange: (value: string) => void;
  onLastNameChange: (value: string) => void;
}

export const ContactInformation = ({
  firstName,
  lastName,
  email,
  onFirstNameChange,
  onLastNameChange,
}: ContactInformationProps) => {
  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-primary text-center">Contact Information</h3>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700">First Name</Label>
            <Input
              value={firstName}
              onChange={(e) => onFirstNameChange(e.target.value)}
              placeholder="Enter your first name"
              className="max-w-full border-gray-400"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700">Last Name</Label>
            <Input
              value={lastName}
              onChange={(e) => onLastNameChange(e.target.value)}
              placeholder="Enter your last name"
              className="max-w-full border-gray-400"
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label className="text-sm font-medium text-gray-700">Email</Label>
          <Input value={email} disabled className="bg-gray-50 border-gray-400" />
        </div>
      </div>
    </div>
  );
};