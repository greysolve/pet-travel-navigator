
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SignUpForm } from "@/components/auth/SignUpForm";
import { SignInForm } from "@/components/auth/SignInForm";
import { PasswordResetForm } from "@/components/auth/PasswordResetForm";

interface AuthDialogContentProps {
  isOpen: boolean;
  isSignUp: boolean;
  isPasswordReset: boolean;
  isLoading: boolean;
  onOpenChange: (open: boolean) => void;
  onSignIn: (email: string, password: string) => Promise<void>;
  onSignUp: (email: string, password: string, firstName: string, lastName: string) => Promise<void>;
  onPasswordReset: (email: string) => Promise<void>;
  onToggleMode: (isSignUp: boolean) => void;
  onForgotPassword: () => void;
}

export const AuthDialogContent = ({
  isOpen,
  isSignUp,
  isPasswordReset,
  isLoading,
  onOpenChange,
  onSignIn,
  onSignUp,
  onPasswordReset,
  onToggleMode,
  onForgotPassword,
}: AuthDialogContentProps) => {
  const getTitle = () => {
    if (isPasswordReset) return "Reset Password";
    return isSignUp ? "Sign Up" : "Sign In";
  };

  const getDescription = () => {
    if (isPasswordReset) return "Enter your email to receive a password reset link";
    return isSignUp
      ? "Create an account to get started"
      : "Welcome back! Please sign in to continue";
  };

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
          <DialogTitle>{getTitle()}</DialogTitle>
          <DialogDescription>
            {getDescription()}
          </DialogDescription>
        </DialogHeader>
        {isPasswordReset ? (
          <PasswordResetForm
            onPasswordReset={onPasswordReset}
            isLoading={isLoading}
            onToggleMode={() => onForgotPassword()}
          />
        ) : isSignUp ? (
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
            onForgotPassword={onForgotPassword}
          />
        )}
      </DialogContent>
    </Dialog>
  );
};
