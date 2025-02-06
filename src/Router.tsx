import { createBrowserRouter } from "react-router-dom";
import App from "./App";
import NotFound from "./NotFound";
import Index from "./Index";
import Profile from "./Profile";
import ProtectedRoute from "./ProtectedRoute";
import Admin from "./Admin";
import SampleResults from "./SampleResults";
import AuthCallback from "./AuthCallback";

const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
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
