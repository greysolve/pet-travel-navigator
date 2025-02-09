
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: "site_manager" | "pet_lover";
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
      console.log("Access check:", {
        userRole: profile?.role,
        requiredRole,
        hasAccess: profile?.role === requiredRole,
        path: window.location.pathname
      });

      // If no role is found or role doesn't match required role, redirect
      if (!profile?.role || profile.role !== requiredRole) {
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
