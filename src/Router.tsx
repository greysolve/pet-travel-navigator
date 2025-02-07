
import { createBrowserRouter } from "react-router-dom";
import NotFound from "@/pages/NotFound";
import Index from "@/pages/Index";
import Profile from "@/pages/Profile";
import ProtectedRoute from "@/components/ProtectedRoute";
import Admin from "@/pages/Admin";
import SampleResults from "@/pages/SampleResults";
import AuthCallback from "@/pages/AuthCallback";
import Pets from "@/pages/Pets";
import { Layout } from "@/components/Layout";

const router = createBrowserRouter([
  {
    path: "/",
    element: <Layout />,
    errorElement: <NotFound />,
    children: [
      {
        path: "/",
        element: <Index />,
      },
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
