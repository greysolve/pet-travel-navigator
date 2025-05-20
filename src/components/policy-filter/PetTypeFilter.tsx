
import { Checkbox } from "@/components/ui/checkbox";
import { PetTypeFilter as PetTypeFilterValue } from "@/types/policy-filters";

interface PetTypeFilterProps {
  selectedTypes: PetTypeFilterValue[];
  onChange: (types: PetTypeFilterValue[]) => void;
}

interface PetTypeOption {
  value: PetTypeFilterValue;
  label: string;
}

const PET_TYPE_OPTIONS: PetTypeOption[] = [
  { value: 'dog', label: 'Dogs' },
  { value: 'cat', label: 'Cats' },
  { value: 'bird', label: 'Birds' },
  { value: 'rabbit', label: 'Rabbits' },
  { value: 'rodent', label: 'Rodents' },
  { value: 'other', label: 'Other' }
];

export const PetTypeFilter = ({ selectedTypes, onChange }: PetTypeFilterProps) => {
  const handleTypeToggle = (type: PetTypeFilterValue) => {
    if (selectedTypes.includes(type)) {
      onChange(selectedTypes.filter(t => t !== type));
    } else {
      onChange([...selectedTypes, type]);
    }
  };

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium mb-2">Pet Type</p>
      <div className="grid grid-cols-2 gap-2">
        {PET_TYPE_OPTIONS.map((option) => (
          <div key={option.value} className="flex items-center space-x-2">
            <Checkbox
              id={`pet-type-${option.value}`}
              checked={selectedTypes.includes(option.value)}
              onCheckedChange={() => handleTypeToggle(option.value)}
            />
            <label
              htmlFor={`pet-type-${option.value}`}
              className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              {option.label}
            </label>
          </div>
        ))}
      </div>
    </div>
  );
};
