
import React from "react";
import { Toaster } from "@/components/ui/toaster";
import Router from "./Router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { UserProvider } from "./contexts/user/UserContext";
import { ProfileProvider } from "./contexts/profile/ProfileContext";
import { SystemConfigProvider } from "./contexts/SystemConfigContext";
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
    <React.StrictMode>
      <QueryClientProvider client={queryClient}>
        <UserProvider>
          <ProfileProvider>
            <SystemConfigProvider>
              <Router />
              <Toaster />
            </SystemConfigProvider>
          </ProfileProvider>
        </UserProvider>
      </QueryClientProvider>
    </React.StrictMode>
  );
}

export default App;
