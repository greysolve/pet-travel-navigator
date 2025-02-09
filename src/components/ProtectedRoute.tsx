
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
        path: window.location.pathname
      });

      // Check the user_roles table
      console.log("Checking user_roles table...");
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) {
        console.error("Error fetching user role from DB:", error);
        return "pet_caddie"; // Default to pet_caddie on error
      }

      // If no role found in database, default to pet_caddie
      if (!data) {
        console.log("No role found in database, defaulting to pet_caddie");
        return "pet_caddie";
      }

      console.log("Role from database:", data.role);
      return data.role;
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

      // If no role is found or role doesn't match required role, redirect
      if (!userRole || userRole !== requiredRole) {
        console.log("Access denied, redirecting to home");
        navigate("/");
      }
    }
  }, [user, loading, navigate, requiredRole, userRole, roleLoading]);

  if (loading || roleLoading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  // Only render children if user has the required role
  if (!user || !userRole || (requiredRole && userRole !== requiredRole)) {
    return null;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
