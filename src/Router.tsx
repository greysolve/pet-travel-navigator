import { createBrowserRouter, Outlet } from "react-router-dom";
import NotFound from "@/pages/NotFound";
import Index from "@/pages/Index";
import Profile from "@/pages/Profile";
import Pets from "@/pages/Pets";
import ProtectedRoute from "@/components/ProtectedRoute";
import Admin from "@/pages/Admin";
import SampleResults from "@/pages/SampleResults";
import AuthCallback from "@/pages/AuthCallback";
import AuthDialog from "@/components/AuthDialog";

// Create a protected layout that wraps routes requiring authentication
const ProtectedLayout = () => {
  return <Outlet />;
};

// Create a root layout component that doesn't require authentication
const RootLayout = () => {
  return (
    <div className="relative min-h-screen">
      <div className="absolute top-4 right-4 z-50">
        <AuthDialog />
      </div>
      <Outlet />
    </div>
  );
};

const router = createBrowserRouter([
  {
    path: "/",
    element: <RootLayout />,
    errorElement: <NotFound />,
    children: [
      {
        path: "/",
        element: <Index />,
      },
      {
        // Protected routes group
        element: <ProtectedLayout />,
        children: [
          {
            path: "/profile",
            element: (
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            ),
          },
          {
            path: "/pets",
            element: (
              <ProtectedRoute>
                <Pets />
              </ProtectedRoute>
            ),
          },
          {
            path: "/admin",
            element: (
              <ProtectedRoute requiredRole="site_manager">
                <Admin />
              </ProtectedRoute>
            ),
          },
        ],
      },
      {
        path: "/:route",
        element: <SampleResults />,
      },
    ],
  },
  {
    path: "/auth/callback",
    element: <AuthCallback />,
  },
]);

export default router;
