import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { toast } from "@/components/ui/use-toast";

const AuthCallback = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");

  useEffect(() => {
    const handleEmailVerification = async () => {
      if (token) {
        try {
          const { error } = await supabase.auth.verifyOtp({
            token_hash: token,
            type: 'email',
          });

          if (error) {
            toast({
              title: "Verification failed",
              description: error.message,
              variant: "destructive",
            });
          } else {
            toast({
              title: "Email verified",
              description: "Your email has been successfully verified.",
            });
          }
        } catch (error: any) {
          toast({
            title: "Verification error",
            description: error.message,
            variant: "destructive",
          });
        }
      }
      navigate("/");
    };

    handleEmailVerification();
  }, [navigate, token]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <h2 className="text-2xl font-semibold mb-4">Verifying your email...</h2>
        <p>Please wait while we verify your email address.</p>
      </div>
    </div>
  );
};

export default AuthCallback;