
import { Database } from "@/integrations/supabase/types";

export type PetProfile = Database['public']['Tables']['pet_profiles']['Row'];

export interface PetProfileFormProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: PetProfile;
}

export interface DocumentType {
  value: string;
  label: string;
}

export const documentTypes: DocumentType[] = [
  { value: "health_certificate", label: "Health Certificate" },
  { value: "international_health_certificate", label: "International Health Certificate" },
  { value: "microchip_documentation", label: "Microchip Documentation" },
  { value: "pet_passport", label: "Pet Passport" },
  { value: "rabies_vaccination", label: "Rabies Vaccination" },
  { value: "vaccinations", label: "Vaccinations" },
  { value: "usda_endorsement", label: "USDA Endorsement" },
  { value: "veterinary_certificate", label: "Veterinary Certificate" }
];

export type PetProfileMode = 'default' | 'view';

