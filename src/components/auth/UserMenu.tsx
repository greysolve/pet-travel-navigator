
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ChevronDown } from "lucide-react";
import { UserProfile } from "@/types/auth";

interface UserMenuProps {
  profile: UserProfile;
  userRole: string | null;
  onSignOut: () => Promise<void>;
}

export const UserMenu = ({ profile, userRole, onSignOut }: UserMenuProps) => {
  const navigate = useNavigate();

  const getFirstName = () => {
    if (!profile?.full_name) return "User";
    return profile.full_name.split(" ")[0];
  };

  const getInitials = () => {
    if (!profile?.full_name) return "U";
    const names = profile.full_name.split(" ");
    return names.map(name => name[0]).join("").toUpperCase();
  };

  const handleNavigation = (path: string) => {
    // Ensure we're using absolute paths
    navigate(path.startsWith('/') ? path : `/${path}`);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className="bg-sky-100 hover:bg-sky-200 flex items-center gap-2"
        >
          <Avatar className="h-6 w-6">
            <AvatarImage src={profile?.avatar_url} />
            <AvatarFallback>{getInitials()}</AvatarFallback>
          </Avatar>
          {getFirstName()}
          <ChevronDown className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={() => handleNavigation("/")}>
          Pet Flight Search
        </DropdownMenuItem>
        {userRole === "site_manager" && (
          <DropdownMenuItem onClick={() => handleNavigation("/admin")}>
            Manage
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onClick={() => handleNavigation("/profile")}>
          My Profile
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleNavigation("/pets")}>
          My Pets
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onSignOut}>
          Sign Out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
