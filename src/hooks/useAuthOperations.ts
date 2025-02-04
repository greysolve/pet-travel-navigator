import { supabase } from "@/lib/supabase";
import { toast } from "@/components/ui/use-toast";
import { sendVerificationEmail } from "@/utils/emailVerification";

export function useAuthOperations() {
  const signIn = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`
      }
    });
  };

  const signInWithEmail = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      return { data, error: null };
    } catch (error: any) {
      toast({
        title: "Error signing in",
        description: error.message,
        variant: "destructive",
      });
      return { data: null, error };
    }
  };

  const signUp = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      
      if (error) throw error;
      
      if (data?.user?.confirmation_sent_at) {
        await sendVerificationEmail(email, data.user.confirmation_token || '');
        toast({
          title: "Success",
          description: "Please check your email to verify your account.",
        });
      }
      
      return { data, error: null };
    } catch (error: any) {
      toast({
        title: "Error signing up",
        description: error.message,
        variant: "destructive",
      });
      return { data: null, error };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return {
    signIn,
    signInWithEmail,
    signUp,
    signOut,
  };
}