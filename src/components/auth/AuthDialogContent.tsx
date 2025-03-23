import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SignUpForm } from "@/components/auth/SignUpForm";
import { SignInForm } from "@/components/auth/SignInForm";

interface AuthDialogContentProps {
  isOpen: boolean;
  isSignUp: boolean;
  isLoading: boolean;
  onOpenChange: (open: boolean) => void;
  onSignIn: (email: string, password: string) => Promise<void>;
  onSignUp: (email: string, password: string, firstName: string, lastName: string) => Promise<void>;
  onToggleMode: (isSignUp: boolean) => void;
}

export const AuthDialogContent = ({
  isOpen,
  isSignUp,
  isLoading,
  onOpenChange,
  onSignIn,
  onSignUp,
  onToggleMode,
}: AuthDialogContentProps) => {
  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        onOpenChange(open);
        if (!open) {
          onToggleMode(false);
        }
      }}
    >
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{isSignUp ? "Sign Up" : "Sign In"}</DialogTitle>
          <DialogDescription>
            {isSignUp
              ? "Create an account to get started"
              : "Welcome back! Please sign in to continue"}
          </DialogDescription>
        </DialogHeader>
        {isSignUp ? (
          <SignUpForm
            onSignUp={onSignUp}
            isLoading={isLoading}
            onToggleMode={() => onToggleMode(false)}
          />
        ) : (
          <SignInForm
            onSignIn={onSignIn}
            isLoading={isLoading}
            onToggleMode={() => onToggleMode(true)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
};