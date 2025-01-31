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
      if (!user) {
        console.log("No user found for role check");
        return null;
      }
      console.log("Starting role check for user:", user.id);
      console.log("Required role:", requiredRole);
      console.log("Full user object:", user);
      
      // First check user metadata
      const metadataRole = user.user_metadata?.role;
      console.log("Role from user metadata:", metadataRole);
      
      if (metadataRole === requiredRole) {
        console.log("Role found in metadata, matches required role");
        return metadataRole;
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
      
      console.log("User role data from DB:", data);
      console.log("DB role matches required role:", data?.role === requiredRole);
      return data?.role;
    },
    enabled: !!user && !!requiredRole,
  });

  useEffect(() => {
    console.log("Protected Route state:", {
      loading,
      roleLoading,
      user: !!user,
      userRole,
      requiredRole,
      userMetadata: user?.user_metadata,
      userId: user?.id,
      fullUser: user
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
    console.log("Access denied:", { 
      user: !!user, 
      userRole, 
      requiredRole,
      userMetadata: user?.user_metadata,
      userId: user?.id,
      fullUser: user
    });
    return null;
  }

  console.log("Access granted to protected route");
  return <>{children}</>;
};

export default ProtectedRoute;