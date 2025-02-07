
import { Outlet } from "react-router-dom";
import { UserMenu } from "@/components/auth/UserMenu";
import { useAuth } from "@/contexts/AuthContext";

export const Layout = () => {
  const { profile, signOut } = useAuth();
  const userRole = profile?.role ?? null;

  return (
    <div className="min-h-screen">
      <header className="border-b">
        <div className="container mx-auto py-4 px-4 flex justify-between items-center">
          <div>
            {/* Left side - can add logo/branding here later */}
          </div>
          <div>
            {profile && (
              <UserMenu 
                profile={profile} 
                userRole={userRole} 
                onSignOut={signOut} 
              />
            )}
          </div>
        </div>
      </header>
      <main>
        <Outlet />
      </main>
    </div>
  );
};
