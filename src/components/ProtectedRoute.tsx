import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/auth/AuthContext";
import { useProfile } from "@/contexts/profile/ProfileContext";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: "site_manager" | "pet_lover";
}

const ProtectedRoute = ({ children, requiredRole }: ProtectedRouteProps) => {
  const { user, loading } = useAuth();
  const { profile, loading: profileLoading } = useProfile();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      console.log("No authenticated user, redirecting to home");
      navigate("/");
      return;
    }

    // Only check role if a specific role is required and profile is loaded
    if (!loading && !profileLoading && requiredRole && profile?.userRole !== requiredRole) {
      console.log("Access denied - incorrect role, redirecting to home");
      navigate("/");
      return;
    }
  }, [user, loading, navigate, requiredRole, profile, profileLoading]);

  if (loading || profileLoading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  // Only render children if user is authenticated and has correct role (if required)
  if (!user || (requiredRole && profile?.userRole !== requiredRole)) {
    return null;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
