import { Button } from "@/components/ui/button";
import AuthDialog from "@/components/AuthDialog";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "react-router-dom";

export const Navbar = () => {
  const { session } = useAuth();

  return (
    <nav className="border-b">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <Link to="/" className="text-xl font-bold">
          PetTravel
        </Link>
        
        <div className="flex items-center gap-4">
          {session ? (
            <>
              <Link to="/profile">
                <Button variant="ghost">Profile</Button>
              </Link>
              <Link to="/admin">
                <Button variant="ghost">Admin</Button>
              </Link>
            </>
          ) : (
            <AuthDialog />
          )}
        </div>
      </div>
    </nav>
  );
};