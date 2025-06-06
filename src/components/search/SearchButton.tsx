

import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUser } from "@/contexts/user/UserContext";
import { useAuthDialog } from "@/hooks/useAuthDialog";

interface SearchButtonProps {
  isLoading: boolean;
  onClick: () => Promise<void>;
}

export const SearchButton = ({ isLoading, onClick }: SearchButtonProps) => {
  const { user, profileLoading } = useUser();
  const { showAuthDialog } = useAuthDialog();

  // Combine all loading states
  const isButtonLoading = isLoading || (user && profileLoading);

  const handleButtonClick = () => {
    if (user) {
      // Call the async function without awaiting it
      onClick().catch(console.error);
    } else {
      console.log("No user logged in, showing auth dialog");
      showAuthDialog();
    }
  };

  return (
    <Button 
      className="w-full h-12 mt-4 text-base font-medium bg-primary hover:bg-primary/90"
      onClick={handleButtonClick}
      disabled={isButtonLoading}
    >
      {user ? (
        isButtonLoading ? (
          <>
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Searching...
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
