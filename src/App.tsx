
import { Toaster } from "@/components/ui/toaster";
import Router from "./Router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { UserProvider } from "./contexts/user/UserContext";
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
    <QueryClientProvider client={queryClient}>
      <UserProvider>
        <SystemConfigProvider>
          <Router />
          <Toaster />
        </SystemConfigProvider>
      </UserProvider>
    </QueryClientProvider>
  );
}

export default App;
