
import { ReactNode } from "react";
import AuthDialog from "@/components/AuthDialog";

interface PageLayoutProps {
  children: ReactNode;
}

export const PageLayout = ({ children }: PageLayoutProps) => {
  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4">
        <div className="flex justify-end pt-4">
          <AuthDialog />
        </div>
        {children}
      </div>
    </div>
  );
};
