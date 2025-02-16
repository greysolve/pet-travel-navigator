
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";

interface SearchButtonProps {
  isLoading: boolean;
  isProfileLoading: boolean;
  onClick: () => void;
}

export const SearchButton = ({ isLoading, isProfileLoading, onClick }: SearchButtonProps) => {
  const { user, signIn } = useAuth();

  if (!user) {
    return (
      <Button 
        className="w-full h-12 mt-4 text-base bg-primary hover:bg-primary/90"
        onClick={signIn}
      >
        Sign in to Search
      </Button>
    );
  }

  return (
    <Button 
      className="w-full h-12 mt-4 text-base bg-secondary hover:bg-secondary/90"
      onClick={onClick}
      disabled={isLoading || isProfileLoading}
    >
      {isLoading ? (
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
      )}
    </Button>
  );
};
