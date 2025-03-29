
import { createBrowserRouter, RouterProvider, Outlet } from "react-router-dom";
import NotFound from "@/pages/NotFound";
import Index from "@/pages/Index";
import Profile from "@/pages/Profile";
import Pets from "@/pages/Pets";
import ProtectedRoute from "@/components/ProtectedRoute";
import Admin from "@/pages/Admin";
import Pricing from "@/pages/Pricing";
import SampleResults from "@/pages/SampleResults";
import WebSearch from "@/pages/WebSearch";
import USPetTravel from "@/pages/USPetTravel";
import EUPetPassport from "@/pages/EUPetPassport";
import Contact from "@/pages/Contact";
import AuthCallback from "@/pages/AuthCallback";
import PasswordReset from "@/pages/PasswordReset";
import AuthConfirm from "@/pages/AuthConfirm";
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
        path: "/web-search",
        element: <WebSearch />,
      },
      {
        path: "/us-pet-travel",
        element: <USPetTravel />,
      },
      {
        path: "/eu-pet-passport",
        element: <EUPetPassport />,
      },
      {
        path: "/contact",
        element: <Contact />,
      },
      {
        path: "/auth/callback",
        element: <AuthCallback />,
      },
      {
        path: "/auth/confirm",
        element: <AuthConfirm />,
      },
      {
        path: "/auth/reset-password",
        element: <PasswordReset />,
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
      // Sample results route with parameter
      {
        path: "/:route",
        element: <SampleResults />,
      },
      // Fallback route for 404
      {
        path: "*",
        element: <NotFound />,
      },
    ],
  },
]);

const Router = () => {
  return <RouterProvider router={router} />;
};

export default Router;
