
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { UserRole, SubscriptionPlan } from "@/types/auth";

interface User {
  id: string;
  email: string;
  role?: UserRole;
  full_name?: string;
  plan?: SubscriptionPlan;
}

interface EditUserDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  selectedUser: User | null;
  onUserChange: (user: User | null) => void;
  onSubmit: (e: React.FormEvent) => void;
}

export const EditUserDialog = ({
  isOpen,
  onOpenChange,
  selectedUser,
  onUserChange,
  onSubmit,
}: EditUserDialogProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit User</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={selectedUser?.full_name || ""}
              onChange={(e) =>
                onUserChange(
                  selectedUser
                    ? {
                        ...selectedUser,
                        full_name: e.target.value,
                      }
                    : null
                )
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="role">Role</Label>
            <Select
              value={selectedUser?.role}
              onValueChange={(value: UserRole) =>
                onUserChange(
                  selectedUser
                    ? {
                        ...selectedUser,
                        role: value,
                      }
                    : null
                )
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pet_lover">Pet Lover</SelectItem>
                <SelectItem value="pet_caddie">Pet Caddie</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="plan">Plan</Label>
            <Select
              value={selectedUser?.plan}
              onValueChange={(value: SubscriptionPlan) =>
                onUserChange(
                  selectedUser
                    ? {
                        ...selectedUser,
                        plan: value,
                      }
                    : null
                )
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a plan" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="free">Free</SelectItem>
                <SelectItem value="premium">Premium</SelectItem>
                <SelectItem value="teams">Teams</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button type="submit">Save Changes</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
