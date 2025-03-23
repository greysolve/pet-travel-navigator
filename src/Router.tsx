
import { createBrowserRouter, RouterProvider, Outlet } from "react-router-dom";
import NotFound from "@/pages/NotFound";
import Index from "@/pages/Index";
import Profile from "@/pages/Profile";
import Pets from "@/pages/Pets";
import ProtectedRoute from "@/components/ProtectedRoute";
import Admin from "@/pages/Admin";
import Pricing from "@/pages/Pricing";
import SampleResults from "@/pages/SampleResults";
import AuthCallback from "@/pages/AuthCallback";
import AuthDialog from "@/components/AuthDialog";
import { Toaster } from "@/components/ui/toaster";

// Create a protected layout that wraps routes requiring authentication
const ProtectedLayout = () => {
  return <Outlet />;
};

// Create an app layout that provides auth context
const AppLayout = () => {
  return (
    <div className="relative min-h-screen">
      <div className="absolute top-4 right-4 z-50">
        <AuthDialog />
      </div>
      <Outlet />
      <Toaster />
    </div>
  );
};

const router = createBrowserRouter([
  {
    element: <AppLayout />,
    errorElement: <NotFound />,
    children: [
      {
        path: "/",
        element: <Index />,
      },
      {
        path: "/pricing",
        element: <Pricing />,
      },
      {
        path: "/auth/callback",
        element: <AuthCallback />,
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
      // Move catch-all route to the end
      {
        path: "*",
        element: <SampleResults />,
      },
    ],
  },
]);

const Router = () => {
  return <RouterProvider router={router} />;
};

export default Router;
