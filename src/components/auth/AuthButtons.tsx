
import { Button } from "@/components/ui/button";

interface AuthButtonsProps {
  isLoading: boolean;
  onSignIn: () => void;
  onSignUp: () => void;
}

export const AuthButtons = ({ isLoading, onSignIn, onSignUp }: AuthButtonsProps) => {
  return (
    <div className="flex gap-2">
      <Button
        variant="outline"
        onClick={onSignIn}
        disabled={isLoading}
        className="bg-sky-100 hover:bg-sky-200"
      >
        Sign In
      </Button>
      <Button
        variant="outline"
        onClick={onSignUp}
        disabled={isLoading}
        className="bg-sky-100 hover:bg-sky-200"
      >
        Sign Up
      </Button>
    </div>
  );
};
