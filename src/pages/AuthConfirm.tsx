
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/use-toast";

const AuthConfirm = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isProcessing, setIsProcessing] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const verifyToken = async () => {
      try {
        // Get parameters from URL
        const tokenHash = searchParams.get('token_hash');
        const type = searchParams.get('type');
        const next = searchParams.get('next') || '/';

        console.log("Processing auth confirmation:", {
          hasTokenHash: !!tokenHash,
          type,
          next
        });

        if (!tokenHash || !type) {
          setError("Invalid or missing parameters in the URL");
          setIsProcessing(false);
          return;
        }

        // Verify the OTP token
        const { error } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: type as any, // TypeScript needs this cast
        });

        if (error) {
          console.error("Error verifying token:", error);
          setError(error.message);
          setIsProcessing(false);
          return;
        }

        console.log("Token verified successfully, redirecting to:", next);

        // On success, redirect to the next parameter or home
        navigate(next);
      } catch (err) {
        console.error("Unexpected error during token verification:", err);
        setError("An unexpected error occurred");
        setIsProcessing(false);
      }
    };

    verifyToken();
  }, [navigate, searchParams]);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 px-4">
        <div className="w-full max-w-md p-8 space-y-8 bg-white rounded-lg shadow-lg">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-red-600">Verification Error</h2>
            <p className="mt-2 text-gray-600">{error}</p>
          </div>
          <button
            onClick={() => navigate("/")}
            className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Return to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <h2 className="text-2xl font-semibold mb-4">Verifying...</h2>
        <p>Please wait while we verify your request.</p>
      </div>
    </div>
  );
};

export default AuthConfirm;
