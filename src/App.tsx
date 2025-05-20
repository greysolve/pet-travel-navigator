
import React from "react";
import { Toaster } from "@/components/ui/toaster";
import Router from "./Router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { UserProvider } from "./contexts/user/UserContext";
import { ProfileProvider } from "./contexts/profile/ProfileContext";
import { SystemConfigProvider } from "./contexts/SystemConfigContext";
import "./App.css";

// Create a new QueryClient instance
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
      <React.StrictMode>
        <UserProvider>
          <ProfileProvider>
            <SystemConfigProvider>
              <Router />
              <Toaster />
            </SystemConfigProvider>
          </ProfileProvider>
        </UserProvider>
      </React.StrictMode>
    </QueryClientProvider>
  );
}

export default App;
