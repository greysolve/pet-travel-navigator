
import AuthDialog from "@/components/AuthDialog";

interface PageLayoutProps {
  children: React.ReactNode;
}

export const PageLayout = ({ children }: PageLayoutProps) => {
  return (
    <div className="min-h-screen">
      <div className="container mx-auto">
        <div className="flex justify-end py-4">
          <AuthDialog />
        </div>
        {children}
      </div>
    </div>
  );
};
