import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown } from "lucide-react";

const AuthDialog = () => {
  const { user, signIn, signOut } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  const { data: userRole } = useQuery({
    queryKey: ["userRole", user?.id],
    queryFn: async () => {
      if (!user) return null;
      
      // First check user metadata
      if (user.user_metadata?.role === "site_manager") {
        return "site_manager";
      }

      // If not in metadata, check the user_roles table
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .single();

      if (error) {
        console.error("Error fetching user role:", error);
        return null;
      }

      return data?.role;
    },
    enabled: !!user,
  });

  const getFirstName = () => {
    if (!user) return "";
    if (user.user_metadata?.full_name) {
      return user.user_metadata.full_name.split(" ")[0];
    }
    return user.email?.split("@")[0] || "";
  };

  const getInitials = () => {
    const name = getFirstName();
    return name.substring(0, 2).toUpperCase();
  };

  const handleSignIn = async () => {
    setIsLoading(true);
    try {
      await signIn();
    } catch (error) {
      console.error("Error signing in:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = async () => {
    setIsLoading(true);
    try {
      await signOut();
      navigate("/");
    } catch (error) {
      console.error("Error signing out:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex gap-2 items-center">
      {user ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              className="bg-sky-100 hover:bg-sky-200 flex items-center gap-2"
            >
              <Avatar className="h-6 w-6">
                <AvatarImage src={user.user_metadata?.avatar_url} />
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
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleSignOut}>
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        <Button
          variant="outline"
          onClick={handleSignIn}
          disabled={isLoading}
          className="bg-sky-100 hover:bg-sky-200"
        >
          Sign In
        </Button>
      )}
    </div>
  );
};

export default AuthDialog;