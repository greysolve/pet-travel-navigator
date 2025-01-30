import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";

const AuthCallback = () => {
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate("/profile");
      } else {
        navigate("/");
      }
    });
  }, [navigate]);

  return <div>Loading...</div>;
};

export default AuthCallback;