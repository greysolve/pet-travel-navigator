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
    <div>
      <h3 className="text-lg font-semibold mb-4">Contact Information</h3>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="block text-sm font-medium mb-1">First Name</Label>
            <Input
              value={firstName}
              onChange={(e) => onFirstNameChange(e.target.value)}
              placeholder="Enter your first name"
            />
          </div>
          <div>
            <Label className="block text-sm font-medium mb-1">Last Name</Label>
            <Input
              value={lastName}
              onChange={(e) => onLastNameChange(e.target.value)}
              placeholder="Enter your last name"
            />
          </div>
        </div>
        <div>
          <Label className="block text-sm font-medium mb-1">Email</Label>
          <Input value={email} disabled />
        </div>
      </div>
    </div>
  );
};