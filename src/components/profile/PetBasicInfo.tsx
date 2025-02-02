import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface PetBasicInfoProps {
  name: string;
  type: string;
  breed: string;
  age: string;
  weight: string;
  onNameChange: (value: string) => void;
  onTypeChange: (value: string) => void;
  onBreedChange: (value: string) => void;
  onAgeChange: (value: string) => void;
  onWeightChange: (value: string) => void;
}

export const PetBasicInfo = ({
  name,
  type,
  breed,
  age,
  weight,
  onNameChange,
  onTypeChange,
  onBreedChange,
  onAgeChange,
  onWeightChange,
}: PetBasicInfoProps) => {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Name *</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          placeholder="Pet's name"
          required
          className="border-gray-400"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="type">Type *</Label>
        <Select value={type} onValueChange={onTypeChange} required>
          <SelectTrigger className="border-gray-400">
            <SelectValue placeholder="Select pet type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="dog">Dog</SelectItem>
            <SelectItem value="cat">Cat</SelectItem>
            <SelectItem value="bird">Bird</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="breed">Breed</Label>
        <Input
          id="breed"
          value={breed}
          onChange={(e) => onBreedChange(e.target.value)}
          placeholder="Pet's breed"
          className="border-gray-400"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="age">Age (years)</Label>
          <Input
            id="age"
            type="number"
            value={age}
            onChange={(e) => onAgeChange(e.target.value)}
            placeholder="Age in years"
            min="0"
            step="0.1"
            className="border-gray-400"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="weight">Weight (kg)</Label>
          <Input
            id="weight"
            type="number"
            value={weight}
            onChange={(e) => onWeightChange(e.target.value)}
            placeholder="Weight in kg"
            min="0"
            step="0.1"
            className="border-gray-400"
          />
        </div>
      </div>
    </div>
  );
};