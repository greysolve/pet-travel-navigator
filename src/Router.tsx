
import { createBrowserRouter, Outlet } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import NotFound from "@/pages/NotFound";
import Index from "@/pages/Index";
import Profile from "@/pages/Profile";
import Pets from "@/pages/Pets";
import ProtectedRoute from "@/components/ProtectedRoute";
import Admin from "@/pages/Admin";
import SampleResults from "@/pages/SampleResults";
import AuthCallback from "@/pages/AuthCallback";

// Create a protected layout that wraps routes requiring authentication
const ProtectedLayout = () => {
  return (
    <AuthProvider>
      <Outlet />
    </AuthProvider>
  );
};

// Create a root layout component that doesn't require authentication
const RootLayout = () => {
  return <Outlet />;
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
