
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ChevronDown } from "lucide-react";
import { UserProfile } from "@/types/auth";

interface UserMenuProps {
  profile: UserProfile | null;
  userRole: string | null;
  onSignOut: () => Promise<void>;
}

export const UserMenu = ({ profile, userRole, onSignOut }: UserMenuProps) => {
  const navigate = useNavigate();

  const getFirstName = () => {
    if (!profile?.full_name) return "";
    return profile.full_name.split(" ")[0];
  };

  const getInitials = () => {
    if (!profile?.full_name) return "";
    const names = profile.full_name.split(" ");
    return names.map(name => name[0]).join("").toUpperCase();
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
        {userRole === "site_manager" && (
          <DropdownMenuItem onClick={() => navigate("/admin")}>
            Manage
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onClick={() => navigate("/profile")}>
          My Profile
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onSignOut}>
          Sign Out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
