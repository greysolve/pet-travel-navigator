
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "react-router-dom";
import router from "@/Router";
import { ProfileProvider } from "@/contexts/ProfileContext";
import { AuthProvider } from "@/contexts/AuthContext";

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ProfileProvider>
        <AuthProvider>
          <RouterProvider router={router} />
        </AuthProvider>
      </ProfileProvider>
    </QueryClientProvider>
  );
}

export default App;
