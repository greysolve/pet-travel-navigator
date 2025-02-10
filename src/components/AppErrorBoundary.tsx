
import { AuthProvider } from "@/contexts/AuthContext";
import NotFound from "@/pages/NotFound";

const AppErrorBoundary = () => {
  return (
    <AuthProvider>
      <div className="relative min-h-screen">
        <NotFound />
      </div>
    </AuthProvider>
  );
};

export default AppErrorBoundary;
