import { Button } from "@/components/ui/button";
import AuthDialog from "@/components/AuthDialog";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "react-router-dom";

export const Navbar = () => {
  const { user } = useAuth();

  return (
    <nav className="w-full border-b bg-background">
      <div className="container flex h-14 items-center justify-between">
        <Link to="/" className="flex items-center space-x-2">
          <span className="font-bold">
            PetTravel Assistant
          </span>
        </Link>
        <AuthDialog />
      </div>
    </nav>
  );
};