
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: "site_manager" | "pet_lover" | "pet_caddie";
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

    if (!loading && !profileLoading && requiredRole) {
      // Direct role check without optional chaining
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

  if (loading || profileLoading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  // Only render children if user has the required role
  if (!user || !profile?.role || (requiredRole && profile.role !== requiredRole)) {
    return null;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
