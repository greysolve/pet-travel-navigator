
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/auth/AuthContext";
import { useProfile } from "@/contexts/profile/ProfileContext";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: "site_manager" | "pet_lover";
}

const ProtectedRoute = ({ children, requiredRole }: ProtectedRouteProps) => {
  const { user, loading: authLoading } = useAuth();
  const { profile, loading: profileLoading, initialized } = useProfile();
  const navigate = useNavigate();
  const [showLoading, setShowLoading] = useState(true);

  // Add a timeout to prevent long loading states
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowLoading(false);
    }, 5000);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    console.log("ProtectedRoute: Checking access", { 
      user: !!user, 
      authLoading, 
      profileLoading, 
      initialized,
      requiredRole,
      userRole: profile?.userRole 
    });

    // Only redirect if auth is not loading and user is not present
    if (!authLoading && !user) {
      console.log("ProtectedRoute: No authenticated user, redirecting to home");
      navigate("/");
      return;
    }

    // Only check role if profile has been initialized
    if (!authLoading && !profileLoading && initialized && requiredRole && profile?.userRole !== requiredRole) {
      console.log("ProtectedRoute: Access denied - incorrect role, redirecting to home");
      navigate("/");
      return;
    }
  }, [user, authLoading, profileLoading, initialized, navigate, requiredRole, profile]);

  // Show loading state but with a timeout to avoid infinite loading
  if ((authLoading || (profileLoading && !initialized)) && showLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-lg font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  // Fallback behavior: if loading takes too long, attempt to show content anyway
  if (!showLoading && (authLoading || profileLoading)) {
    console.log("ProtectedRoute: Loading timeout, showing content anyway");
    return <>{children}</>;
  }

  // Don't render if user is not authenticated
  if (!user) {
    return null;
  }

  // Don't render if required role is not met
  if (requiredRole && profile?.userRole !== requiredRole) {
    return null;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
