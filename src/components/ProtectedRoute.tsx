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
      console.log("Fetching role for user:", user.id);
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .single();
      
      if (error) {
        console.error("Error fetching user role:", error);
        return null;
      }
      console.log("User role data:", data);
      return data?.role;
    },
    enabled: !!user,
  });

  useEffect(() => {
    console.log("Protected Route state:", {
      loading,
      roleLoading,
      user: !!user,
      userRole,
      requiredRole
    });

    if (!loading && !user) {
      console.log("No user, redirecting to home");
      navigate("/");
      return;
    }
    
    if (!loading && !roleLoading && requiredRole) {
      console.log("Checking role access:", {
        userRole,
        requiredRole,
        hasAccess: userRole === requiredRole
      });
      
      if (userRole !== requiredRole) {
        console.log("Unauthorized access attempt. Required role:", requiredRole, "User role:", userRole);
        navigate("/");
      }
    }
  }, [user, loading, navigate, requiredRole, userRole, roleLoading]);

  if (loading || roleLoading) {
    console.log("Loading state:", { loading, roleLoading });
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  if (!user || (requiredRole && userRole !== requiredRole)) {
    console.log("Access denied:", { user: !!user, userRole, requiredRole });
    return null;
  }

  console.log("Access granted to protected route");
  return <>{children}</>;
};

export default ProtectedRoute;