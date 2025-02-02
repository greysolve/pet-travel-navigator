import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/use-toast";

interface EditPetDialogProps {
  pet: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export const EditPetDialog = ({
  pet,
  open,
  onOpenChange,
  onSuccess,
}: EditPetDialogProps) => {
  const [name, setName] = useState(pet.name);
  const [type, setType] = useState(pet.type);
  const [breed, setBreed] = useState(pet.breed || "");
  const [chipNumber, setChipNumber] = useState(pet.chip_number || "");
  const [chipAuthority, setChipAuthority] = useState(pet.chip_authority || "");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setName(pet.name);
      setType(pet.type);
      setBreed(pet.breed || "");
      setChipNumber(pet.chip_number || "");
      setChipAuthority(pet.chip_authority || "");
    }
  }, [open, pet]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const { error } = await supabase
        .from("pet_profiles")
        .update({
          name,
          type,
          breed: breed || null,
          chip_number: chipNumber || null,
          chip_authority: chipAuthority || null,
        })
        .eq("id", pet.id);

      if (error) throw error;

      toast({
        title: "Pet profile updated",
        description: "Your pet's profile has been updated successfully.",
      });
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error("Error updating pet profile:", error);
      toast({
        title: "Error",
        description: "Failed to update pet profile",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Pet Profile</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Pet Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="type">Pet Type</Label>
            <Select value={type} onValueChange={setType} required>
              <SelectTrigger>
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
            <Label htmlFor="breed">Breed (Optional)</Label>
            <Input
              id="breed"
              value={breed}
              onChange={(e) => setBreed(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="chipNumber">Microchip Number (Optional)</Label>
            <Input
              id="chipNumber"
              value={chipNumber}
              onChange={(e) => setChipNumber(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="chipAuthority">
              Microchip Registration Authority (Optional)
            </Label>
            <Input
              id="chipAuthority"
              value={chipAuthority}
              onChange={(e) => setChipAuthority(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};