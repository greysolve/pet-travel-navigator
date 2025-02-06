import { Routes, Route } from "react-router-dom";
import ProtectedRoute from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Profile from "./pages/Profile";
import AuthCallback from "./pages/AuthCallback";
import Admin from "./pages/Admin";
import SampleResults from "./pages/SampleResults";

export function Router() {
  return (
    <Routes>
      <Route path="/" element={<Index />} />
      <Route path="/profile" element={<Profile />} />
      <Route path="/auth/callback" element={<AuthCallback />} />
      <Route 
        path="/admin" 
        element={
          <ProtectedRoute requiredRole="site_manager">
            <Admin />
          </ProtectedRoute>
        } 
      />
      <Route path="/ORG-DST-Sample" element={<SampleResults />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}