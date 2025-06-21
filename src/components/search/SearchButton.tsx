
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

  const isButtonLoading = isLoading || (user && profileLoading);

  const handleButtonClick = () => {
    if (user) {
      onClick().catch(console.error);
    } else {
      console.log("No user logged in, showing auth dialog");
      showAuthDialog();
    }
  };

  return (
    <Button 
      className="w-full bg-gradient-to-r from-[#d4af37] to-[#f4d03f] hover:from-[#f4d03f] hover:to-[#d4af37] text-[#1a365d] text-xl font-bold py-5 mt-6 rounded-xl shadow-[0_8px_25px_rgba(212,175,55,0.4)] hover:shadow-[0_12px_30px_rgba(212,175,55,0.6)] hover:-translate-y-1 transition-all duration-300 uppercase tracking-wider font-serif"
      onClick={handleButtonClick}
      disabled={isButtonLoading}
    >
      {user ? (
        isButtonLoading ? (
          <>
            <Loader2 className="mr-2 h-6 w-6 animate-spin" />
            Searching...
          </>
        ) : (
          "Search Premium Flights"
        )
      ) : (
        "Sign in to Search"
      )}
    </Button>
  );
};
