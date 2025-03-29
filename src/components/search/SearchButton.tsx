
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/auth/AuthContext";
import { useAuthDialog } from "@/hooks/useAuthDialog";

interface SearchButtonProps {
  isLoading: boolean;
  isProfileLoading: boolean;
  onClick: () => void;
}

export const SearchButton = ({ isLoading, isProfileLoading, onClick }: SearchButtonProps) => {
  const { user } = useAuth();
  const { showAuthDialog } = useAuthDialog();

  const handleButtonClick = () => {
    if (user) {
      onClick();
    } else {
      console.log("No user logged in, showing auth dialog");
      showAuthDialog();
    }
  };

  return (
    <Button 
      className="w-full h-12 mt-4 text-base font-medium bg-primary hover:bg-primary/90"
      onClick={handleButtonClick}
      disabled={user ? (isLoading || isProfileLoading) : false}
    >
      {user ? (
        isLoading ? (
          <>
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Searching...
          </>
        ) : isProfileLoading ? (
          <>
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Loading Profile...
          </>
        ) : (
          "Search"
        )
      ) : (
        "Sign in to Search"
      )}
    </Button>
  );
};
