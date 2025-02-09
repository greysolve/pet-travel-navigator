
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

      // Fetch role directly from user_roles table
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) {
        console.error("Error fetching user role:", error);
        return null;
      }

      // If no role found in database, default to pet_caddie
      const role = data?.role || "pet_caddie";
      console.log("Role from database:", role);
      return role;
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
