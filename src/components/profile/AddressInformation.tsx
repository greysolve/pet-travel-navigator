import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface Country {
  id: string;
  name: string;
  code: string;
}

interface AddressInformationProps {
  addressLine1: string;
  addressLine2: string;
  addressLine3: string;
  locality: string;
  administrativeArea: string;
  postalCode: string;
  selectedCountryId: string;
  onAddressLine1Change: (value: string) => void;
  onAddressLine2Change: (value: string) => void;
  onAddressLine3Change: (value: string) => void;
  onLocalityChange: (value: string) => void;
  onAdministrativeAreaChange: (value: string) => void;
  onPostalCodeChange: (value: string) => void;
  onCountryChange: (value: string) => void;
}

export const AddressInformation = ({
  addressLine1,
  addressLine2,
  addressLine3,
  locality,
  administrativeArea,
  postalCode,
  selectedCountryId,
  onAddressLine1Change,
  onAddressLine2Change,
  onAddressLine3Change,
  onLocalityChange,
  onAdministrativeAreaChange,
  onPostalCodeChange,
  onCountryChange,
}: AddressInformationProps) => {
  const { data: countries = [] } = useQuery<Country[]>({
    queryKey: ['countries'],
    queryFn: async () => {
      console.log('Fetching countries...');
      const { data, error } = await supabase
        .from('countries')
        .select('id, name, code')
        .order('name');
      
      if (error) {
        console.error('Error fetching countries:', error);
        throw error;
      }
      console.log('Countries fetched:', data);
      return data;
    },
  });

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-primary">Address</h3>
      <div className="space-y-4">
        <div className="space-y-2">
          <Label className="text-sm font-medium text-gray-700">Address Line 1</Label>
          <Input
            value={addressLine1}
            onChange={(e) => onAddressLine1Change(e.target.value)}
            placeholder="Street address"
            className="border-gray-400"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-sm font-medium text-gray-700">Address Line 2</Label>
          <Input
            value={addressLine2}
            onChange={(e) => onAddressLine2Change(e.target.value)}
            placeholder="Apartment, suite, etc."
            className="border-gray-400"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-sm font-medium text-gray-700">Address Line 3</Label>
          <Input
            value={addressLine3}
            onChange={(e) => onAddressLine3Change(e.target.value)}
            placeholder="Additional address information"
            className="border-gray-400"
          />
        </div>
        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700">City</Label>
            <Input
              value={locality}
              onChange={(e) => onLocalityChange(e.target.value)}
              placeholder="City"
              className="border-gray-400"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700">State/Province</Label>
            <Input
              value={administrativeArea}
              onChange={(e) => onAdministrativeAreaChange(e.target.value)}
              placeholder="State or province"
              className="border-gray-400"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700">Postal Code</Label>
            <Input
              value={postalCode}
              onChange={(e) => onPostalCodeChange(e.target.value)}
              placeholder="Postal code"
              className="border-gray-400"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700">Country</Label>
            <Select value={selectedCountryId} onValueChange={onCountryChange}>
              <SelectTrigger className="border-gray-400">
                <SelectValue placeholder="Select a country" />
              </SelectTrigger>
              <SelectContent>
                {countries.map((country) => (
                  <SelectItem key={country.id} value={country.id}>
                    {country.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    </div>
  );
};