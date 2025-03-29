
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUser } from "@/contexts/user/UserContext";
import { useAuthDialog } from "@/hooks/useAuthDialog";

interface SearchButtonProps {
  isLoading: boolean;
  onClick: () => void;
}

export const SearchButton = ({ isLoading, onClick }: SearchButtonProps) => {
  const { user, profileLoading, lifecycleState, profileInitialized } = useUser();
  const { showAuthDialog } = useAuthDialog();

  const handleButtonClick = () => {
    if (user) {
      onClick();
    } else {
      console.log("No user logged in, showing auth dialog");
      showAuthDialog();
    }
  };

  // Determine if the button should be disabled
  const isButtonDisabled = user ? (isLoading || profileLoading || !profileInitialized) : false;

  return (
    <Button 
      className="w-full h-12 mt-4 text-base font-medium bg-primary hover:bg-primary/90"
      onClick={handleButtonClick}
      disabled={isButtonDisabled}
    >
      {user ? (
        isLoading ? (
          <>
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Searching...
          </>
        ) : profileLoading || !profileInitialized ? (
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
