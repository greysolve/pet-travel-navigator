
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
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
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import type { UserRole, SubscriptionPlan } from "@/types/auth";

interface User {
  id: string;
  email: string;
  role?: UserRole;
  full_name?: string;
  plan?: SubscriptionPlan;
}

const UserManagement = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  // Fetch users using the Edge Function
  const { data: users, isLoading, error } = useQuery({
    queryKey: ["users"],
    queryFn: async () => {
      console.log("Starting user fetch request...");
      const { data, error: functionError } = await supabase.functions.invoke('manage_users', {
        method: 'GET'
      });

      if (functionError) {
        console.error("Error in function:", functionError);
        throw functionError;
      }

      console.log("Users data received:", data);
      return data;
    },
  });

  // Log error if present
  if (error) {
    console.error("Query error:", error);
  }

  const updateUser = useMutation({
    mutationFn: async (userData: { id: string; full_name?: string; role?: UserRole; plan?: SubscriptionPlan }) => {
      console.log("Updating user:", userData);
      const { error } = await supabase.functions.invoke('manage_users', {
        method: 'PATCH',
        body: userData
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast({
        title: "Success",
        description: "User updated successfully",
      });
      setIsEditDialogOpen(false);
    },
    onError: (error) => {
      console.error("Error updating user:", error);
      toast({
        title: "Error",
        description: "Failed to update user",
        variant: "destructive",
      });
    },
  });

  // Delete user mutation
  const deleteUser = useMutation({
    mutationFn: async (userId: string) => {
      console.log("Deleting user:", userId);
      
      const { error: deleteAuthError } = await supabase.functions.invoke('manage_users', {
        method: 'DELETE',
        body: { userId }
      });

      if (deleteAuthError) {
        console.error("Error deleting auth user:", deleteAuthError);
        throw deleteAuthError;
      }

      toast({
        title: "Success",
        description: "User deleted successfully",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (error) => {
      console.error("Error deleting user:", error);
      toast({
        title: "Error",
        description: "Failed to delete user",
        variant: "destructive",
      });
    },
  });

  const handleUpdateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    const updateData: { id: string; full_name?: string; role?: UserRole; plan?: SubscriptionPlan } = {
      id: selectedUser.id,
    };

    if (selectedUser.full_name !== undefined) {
      updateData.full_name = selectedUser.full_name;
    }

    if (selectedUser.role !== undefined) {
      updateData.role = selectedUser.role as UserRole;
    }

    if (selectedUser.plan !== undefined) {
      updateData.plan = selectedUser.plan;
    }

    updateUser.mutate(updateData);
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'site_manager':
        return 'bg-red-500';
      case 'pet_caddie':
        return 'bg-purple-500';
      default:
        return 'bg-blue-500';
    }
  };

  const getPlanBadgeColor = (plan: string) => {
    switch (plan) {
      case 'enterprise':
        return 'bg-purple-500';
      case 'premium':
        return 'bg-yellow-500';
      case 'basic':
        return 'bg-green-500';
      default:
        return 'bg-gray-500';
    }
  };

  if (isLoading) {
    return <div>Loading users...</div>;
  }

  if (error) {
    return <div>Error loading users: {error.message}</div>;
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">User Management</h2>
      
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Plan</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users?.map((user: User) => (
            <TableRow key={user.id}>
              <TableCell>{user.full_name || "No name"}</TableCell>
              <TableCell>{user.email}</TableCell>
              <TableCell>
                <Badge className={`${getRoleBadgeColor(user.role || '')}`}>
                  {user.role || 'pet_lover'}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge className={`${getPlanBadgeColor(user.plan || '')}`}>
                  {user.plan || 'free'}
                </Badge>
              </TableCell>
              <TableCell className="space-x-2">
                <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                  <DialogTrigger asChild>
                    <Button
                      variant="outline"
                      onClick={() => setSelectedUser(user)}
                    >
                      Edit
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Edit User</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleUpdateUser} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">Name</Label>
                        <Input
                          id="name"
                          value={selectedUser?.full_name || ""}
                          onChange={(e) =>
                            setSelectedUser(
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
                            setSelectedUser(
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
                            setSelectedUser(
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
                            <SelectItem value="basic">Basic</SelectItem>
                            <SelectItem value="premium">Premium</SelectItem>
                            <SelectItem value="enterprise">Enterprise</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <Button type="submit">Save Changes</Button>
                    </form>
                  </DialogContent>
                </Dialog>

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive">Delete</Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete
                        the user account and all associated data.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => deleteUser.mutate(user.id)}
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default UserManagement;
