
import { ReactNode } from "react";
import AuthDialog from "@/components/AuthDialog";

interface PageLayoutProps {
  children: ReactNode;
  fullWidth?: boolean;
}

export const PageLayout = ({ children, fullWidth = false }: PageLayoutProps) => {
  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4">
        <div className="flex justify-end pt-4">
          <AuthDialog />
        </div>
      </div>
      {fullWidth ? children : (
        <div className="container mx-auto px-4">
          {children}
        </div>
      )}
    </div>
  );
};
