import { useState } from "react";
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
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/components/ui/use-toast";

interface AddPetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export const AddPetDialog = ({
  open,
  onOpenChange,
  onSuccess,
}: AddPetDialogProps) => {
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [type, setType] = useState("");
  const [breed, setBreed] = useState("");
  const [chipNumber, setChipNumber] = useState("");
  const [chipAuthority, setChipAuthority] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from("pet_profiles").insert({
        user_id: user.id,
        name,
        type,
        breed: breed || null,
        chip_number: chipNumber || null,
        chip_authority: chipAuthority || null,
      });

      if (error) throw error;

      toast({
        title: "Pet profile created",
        description: "Your pet's profile has been created successfully.",
      });
      onSuccess();
      onOpenChange(false);
      resetForm();
    } catch (error) {
      console.error("Error creating pet profile:", error);
      toast({
        title: "Error",
        description: "Failed to create pet profile",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setName("");
    setType("");
    setBreed("");
    setChipNumber("");
    setChipAuthority("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New Pet</DialogTitle>
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
              {isSubmitting ? "Adding..." : "Add Pet"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};