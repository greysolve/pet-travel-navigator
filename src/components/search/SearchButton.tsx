
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/auth/AuthContext";
import { useProfile } from "@/contexts/profile/ProfileContext";
import { useAuthDialog } from "@/hooks/useAuthDialog";

interface SearchButtonProps {
  isLoading: boolean;
  onClick: () => void;
}

export const SearchButton = ({ isLoading, onClick }: SearchButtonProps) => {
  const { user } = useAuth();
  const { loading: profileLoading } = useProfile();
  const { showAuthDialog } = useAuthDialog();

  const handleButtonClick = () => {
    if (user) {
      onClick();
    } else {
      console.log("No user logged in, showing auth dialog");
      showAuthDialog();
    }
  };

  const buttonDisabled = isLoading || (user && profileLoading);
  
  return (
    <Button 
      className="w-full h-12 mt-4 text-base font-medium bg-primary hover:bg-primary/90"
      onClick={handleButtonClick}
      disabled={buttonDisabled}
    >
      {user ? (
        isLoading ? (
          <>
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Searching...
          </>
        ) : profileLoading ? (
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
