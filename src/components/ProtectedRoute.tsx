
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { UserRole } from "@/types/auth";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: UserRole;
}

const ProtectedRoute = ({ children, requiredRole }: ProtectedRouteProps) => {
  const { user, profile, loading, profileLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      console.log("No authenticated user, redirecting to home");
      navigate("/");
      return;
    }

    // Strict role check without optional chaining
    if (!loading && !profileLoading && requiredRole) {
      const hasAccess = profile?.role === requiredRole;
      
      console.log("Access check:", {
        userRole: profile?.role,
        requiredRole,
        hasAccess,
        path: window.location.pathname
      });

      if (!hasAccess) {
        console.log("Access denied, redirecting to home");
        navigate("/");
      }
    }
  }, [user, loading, navigate, requiredRole, profile, profileLoading]);

  // Show loading state while checking auth or profile
  if (loading || profileLoading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  // Only render children if all conditions are met
  if (!user || !profile?.role || (requiredRole && profile.role !== requiredRole)) {
    return null;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
