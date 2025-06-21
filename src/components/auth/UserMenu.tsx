
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { ChevronDown, Mail } from "lucide-react";
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
    try {
      const absolutePath = path === 'home' ? '/' : `/${path}`;
      console.log('Navigating to:', absolutePath);
      navigate(absolutePath);
    } catch (error) {
      console.error('Navigation error:', error);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className="bg-[#1a365d] hover:bg-[#2d5a87] border-[#d4af37] text-[#f7f1e8] hover:text-[#f7f1e8] flex items-center gap-2"
        >
          <Avatar className="h-6 w-6">
            <AvatarImage src={profile?.avatar_url} />
            <AvatarFallback className="bg-[#d4af37] text-[#1a365d] text-xs font-bold">
              {getInitials()}
            </AvatarFallback>
          </Avatar>
          {getFirstName()}
          <ChevronDown className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48 bg-white border-2 border-[#d4af37] shadow-lg">
        <DropdownMenuItem onClick={() => handleNavigation("home")} className="hover:bg-[#f7f1e8] text-[#1a365d]">
          Pet Flight Search
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleNavigation("pricing")} className="hover:bg-[#f7f1e8] text-[#1a365d]">
          Manage Subscription
        </DropdownMenuItem>
        {userRole === "site_manager" && (
          <DropdownMenuItem onClick={() => handleNavigation("admin")} className="hover:bg-[#f7f1e8] text-[#1a365d]">
            Manage
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onClick={() => handleNavigation("profile")} className="hover:bg-[#f7f1e8] text-[#1a365d]">
          My Profile
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleNavigation("pets")} className="hover:bg-[#f7f1e8] text-[#1a365d]">
          My Pets
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => handleNavigation("contact")} className="flex items-center gap-2 hover:bg-[#f7f1e8] text-[#1a365d]">
          <Mail className="h-4 w-4" />
          Contact Us
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onSignOut} className="hover:bg-[#f7f1e8] text-[#1a365d]">
          Sign Out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
