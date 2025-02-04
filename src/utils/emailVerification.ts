import { supabase } from "@/lib/supabase";

export const sendVerificationEmail = async (email: string, token: string) => {
  try {
    console.log("Sending verification email to:", email);
    
    const { error } = await supabase.functions.invoke('send-email', {
      body: {
        to: email,
        subject: "Verify your email address",
        html: `
          <h1>Welcome to PetTravel!</h1>
          <p>Please verify your email address by clicking the link below:</p>
          <a href="${window.location.origin}/auth/verify?token=${token}" style="display: inline-block; padding: 10px 20px; background-color: #0ea5e9; color: white; text-decoration: none; border-radius: 5px;">
            Verify Email
          </a>
          <p>If you didn't create an account with us, you can safely ignore this email.</p>
        `
      }
    });

    if (error) throw error;
    console.log("Verification email sent successfully");
    
  } catch (error) {
    console.error("Error sending verification email:", error);
    throw error;
  }
};