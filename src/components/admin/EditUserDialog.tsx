
import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { useDynamicTypes } from "@/hooks/useDynamicTypes";
import type { UserRole, SubscriptionPlan } from "@/types/auth";

interface EditUserData {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  role?: UserRole;
  plan?: SubscriptionPlan;
}

interface EditUserDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: EditUserData) => void;
  isLoading: boolean;
  userData: EditUserData | null;
}

export function EditUserDialog({
  isOpen,
  onClose,
  onSubmit,
  isLoading,
  userData,
}: EditUserDialogProps) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [role, setRole] = useState<UserRole>("");
  const [plan, setPlan] = useState<SubscriptionPlan>("");
  
  const { 
    getRoleNames, 
    getPlanNames, 
    isLoading: typesLoading 
  } = useDynamicTypes();

  // Reset form when userData changes
  useEffect(() => {
    if (userData) {
      setFirstName(userData.first_name || "");
      setLastName(userData.last_name || "");
      setRole(userData.role || "");
      setPlan(userData.plan || "");
    }
  }, [userData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userData) return;

    const updatedUserData: EditUserData = {
      id: userData.id,
      email: userData.email,
      first_name: firstName,
      last_name: lastName,
      role,
      plan,
    };

    onSubmit(updatedUserData);
  };

  const roleNames = getRoleNames();
  const planNames = getPlanNames();

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit User</DialogTitle>
          <DialogDescription>
            Make changes to this user account.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="email" className="text-right">
                Email
              </Label>
              <div className="col-span-3">
                <Input
                  id="email"
                  value={userData?.email || ""}
                  disabled
                  className="bg-gray-100"
                />
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="first-name" className="text-right">
                First name
              </Label>
              <div className="col-span-3">
                <Input
                  id="first-name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                />
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="last-name" className="text-right">
                Last name
              </Label>
              <div className="col-span-3">
                <Input
                  id="last-name"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                />
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="role" className="text-right">
                Role
              </Label>
              <div className="col-span-3">
                <Select
                  value={role}
                  onValueChange={setRole}
                  disabled={typesLoading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                  <SelectContent>
                    {roleNames.map((roleName) => (
                      <SelectItem key={roleName} value={roleName}>
                        {roleName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="plan" className="text-right">
                Plan
              </Label>
              <div className="col-span-3">
                <Select
                  value={plan}
                  onValueChange={setPlan}
                  disabled={typesLoading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a plan" />
                  </SelectTrigger>
                  <SelectContent>
                    {planNames.map((planName) => (
                      <SelectItem key={planName} value={planName}>
                        {planName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isLoading || typesLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save changes"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
