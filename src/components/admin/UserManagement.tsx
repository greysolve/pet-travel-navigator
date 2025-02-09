
import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EditUserDialog } from "./EditUserDialog";
import { DeleteUserDialog } from "./DeleteUserDialog";
import { useUserManagement } from "./hooks/useUserManagement";
import { getRoleBadgeColor, getPlanBadgeColor } from "./utils/userUtils";
import type { UserRole, SubscriptionPlan } from "@/types/auth";

interface User {
  id: string;
  email: string;
  role?: UserRole;
  first_name?: string;
  last_name?: string;
  plan?: SubscriptionPlan;
}

const UserManagement = () => {
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const { users, isLoading, error, updateUser, deleteUser } = useUserManagement();

  const handleUpdateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    const updateData: { 
      id: string; 
      first_name?: string;
      last_name?: string;
      role?: UserRole; 
      plan?: SubscriptionPlan 
    } = {
      id: selectedUser.id,
    };

    if (selectedUser.first_name !== undefined) {
      updateData.first_name = selectedUser.first_name;
    }

    if (selectedUser.last_name !== undefined) {
      updateData.last_name = selectedUser.last_name;
    }

    if (selectedUser.role !== undefined) {
      updateData.role = selectedUser.role as UserRole;
    }

    if (selectedUser.plan !== undefined) {
      updateData.plan = selectedUser.plan;
    }

    updateUser.mutate(updateData);
    setIsEditDialogOpen(false);
  };

  if (isLoading) {
    return <div>Loading users...</div>;
  }

  if (error) {
    return <div>Error loading users: {(error as Error).message}</div>;
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
              <TableCell>
                {user.first_name && user.last_name 
                  ? `${user.first_name} ${user.last_name}`
                  : "No name"}
              </TableCell>
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
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectedUser(user);
                    setIsEditDialogOpen(true);
                  }}
                >
                  Edit
                </Button>
                <DeleteUserDialog onDelete={() => deleteUser.mutate(user.id)} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <EditUserDialog
        isOpen={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        selectedUser={selectedUser}
        onUserChange={setSelectedUser}
        onSubmit={handleUpdateUser}
      />
    </div>
  );
};

export default UserManagement;
