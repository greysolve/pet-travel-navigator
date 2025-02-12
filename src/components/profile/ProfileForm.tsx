
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { ContactInformation } from "./ContactInformation";
import { AddressInformation } from "./AddressInformation";
import { PasswordChange } from "./PasswordChange";
import { UserProfile } from "@/types/auth";

interface ProfileFormProps {
  email: string;
  initialData: {
    firstName: string;
    lastName: string;
    addressLine1: string;
    addressLine2: string;
    addressLine3: string;
    locality: string;
    administrativeArea: string;
    postalCode: string;
    selectedCountryId: string;
  };
  onSubmit: (data: Partial<UserProfile>) => Promise<void>;
}

export const ProfileForm = ({ email, initialData, onSubmit }: ProfileFormProps) => {
  const [isUpdating, setIsUpdating] = useState(false);
  const [formData, setFormData] = useState(initialData);

  const handleSubmit = async () => {
    setIsUpdating(true);
    try {
      await onSubmit({
        full_name: `${formData.firstName} ${formData.lastName}`,
        address_line1: formData.addressLine1,
        address_line2: formData.addressLine2,
        address_line3: formData.addressLine3,
        locality: formData.locality,
        administrative_area: formData.administrativeArea,
        postal_code: formData.postalCode,
        country_id: formData.selectedCountryId,
      });
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="space-y-8">
      <Card>
        <CardContent className="pt-6">
          <ContactInformation
            firstName={formData.firstName}
            lastName={formData.lastName}
            email={email}
            onFirstNameChange={(value) => setFormData(prev => ({ ...prev, firstName: value }))}
            onLastNameChange={(value) => setFormData(prev => ({ ...prev, lastName: value }))}
          />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <AddressInformation
            addressLine1={formData.addressLine1}
            addressLine2={formData.addressLine2}
            addressLine3={formData.addressLine3}
            locality={formData.locality}
            administrativeArea={formData.administrativeArea}
            postalCode={formData.postalCode}
            selectedCountryId={formData.selectedCountryId}
            onAddressLine1Change={(value) => setFormData(prev => ({ ...prev, addressLine1: value }))}
            onAddressLine2Change={(value) => setFormData(prev => ({ ...prev, addressLine2: value }))}
            onAddressLine3Change={(value) => setFormData(prev => ({ ...prev, addressLine3: value }))}
            onLocalityChange={(value) => setFormData(prev => ({ ...prev, locality: value }))}
            onAdministrativeAreaChange={(value) => setFormData(prev => ({ ...prev, administrativeArea: value }))}
            onPostalCodeChange={(value) => setFormData(prev => ({ ...prev, postalCode: value }))}
            onCountryChange={(value) => setFormData(prev => ({ ...prev, selectedCountryId: value }))}
          />
        </CardContent>
      </Card>

      <PasswordChange />

      <div className="flex justify-end">
        <Button 
          onClick={handleSubmit} 
          disabled={isUpdating}
          className="w-32"
        >
          {isUpdating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            'Save Changes'
          )}
        </Button>
      </div>
    </div>
  );
};
