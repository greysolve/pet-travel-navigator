
import { Toaster } from "@/components/ui/toaster";
import Router from "./Router";
import { AuthProvider } from "./contexts/auth/AuthContext";
import { ProfileProvider } from "./contexts/profile/ProfileContext";
import { SystemConfigProvider } from "./contexts/SystemConfigContext";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "./App.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: false,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ProfileProvider>
          <SystemConfigProvider>
            <Router />
            <Toaster />
          </SystemConfigProvider>
        </ProfileProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
