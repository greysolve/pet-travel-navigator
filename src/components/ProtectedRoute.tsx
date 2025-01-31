import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: "site_manager" | "pet_lover";
}

const ProtectedRoute = ({ children, requiredRole }: ProtectedRouteProps) => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  const { data: userRole, isLoading: roleLoading } = useQuery({
    queryKey: ["userRole", user?.id],
    queryFn: async () => {
      if (!user) return null;
      
      console.log("Protected Route - Role Check:", {
        userId: user.id,
        requiredRole,
        userMetadata: user.user_metadata,
        path: window.location.pathname
      });

      // First check user metadata
      if (user.user_metadata?.role === requiredRole) {
        console.log("Role found in metadata, matches required role:", requiredRole);
        return user.user_metadata.role;
      }

      // If not in metadata, check the user_roles table
      console.log("Checking user_roles table...");
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .single();

      if (error) {
        console.error("Error fetching user role from DB:", error);
        return null;
      }

      console.log("Role from database:", data?.role);
      return data?.role;
    },
    enabled: !!user && !!requiredRole,
  });

  useEffect(() => {
    if (!loading && !user) {
      console.log("No authenticated user, redirecting to home");
      navigate("/");
      return;
    }

    if (!loading && !roleLoading && requiredRole) {
      console.log("Access check:", {
        userRole,
        requiredRole,
        hasAccess: userRole === requiredRole,
        path: window.location.pathname
      });

      if (userRole !== requiredRole) {
        console.log("Access denied, redirecting to home");
        navigate("/");
      }
    }
  }, [user, loading, navigate, requiredRole, userRole, roleLoading]);

  if (loading || roleLoading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  if (!user || (requiredRole && userRole !== requiredRole)) {
    return null;
  }

  return <>{children}</>;
};

export default ProtectedRoute;