
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/contexts/ProfileContext";
import { supabase } from "@/integrations/supabase/client";
import { ContactFormValues, subjectOptions } from "./form-schema";

export function useContactFormSubmit() {
  const { toast } = useToast();
  const { user } = useAuth();
  const { profile, updateProfile } = useProfile();
  const [submitting, setSubmitting] = useState(false);
  const [useSmtp, setUseSmtp] = useState(false);
  const [smtpConfigured, setSmtpConfigured] = useState(false);

  // Check if SMTP is configured on component mount
  useEffect(() => {
    const checkSmtpSettings = async () => {
      try {
        const { data } = await supabase
          .from('support_settings')
          .select('use_smtp, smtp_host, smtp_username, smtp_password')
          .limit(1)
          .single();
        
        if (data && data.use_smtp) {
          setUseSmtp(true);
          // Check if all required SMTP settings are configured
          setSmtpConfigured(
            !!data.smtp_host && 
            !!data.smtp_username && 
            !!data.smtp_password
          );
        }
      } catch (error) {
        console.error("Error checking SMTP settings:", error);
      }
    };

    checkSmtpSettings();
  }, []);

  const onSubmit = async (data: ContactFormValues) => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to contact support.",
        variant: "destructive"
      });
      return;
    }

    setSubmitting(true);

    try {
      // If the profile name is blank, update it with the form name
      if (profile && !profile.full_name && data.name) {
        await updateProfile({ full_name: data.name });
      }

      // Get the Supabase JWT
      const { data: authData } = await supabase.auth.getSession();
      const accessToken = authData.session?.access_token || '';

      // Use the hardcoded Supabase URL from the client file
      const supabaseUrl = "https://jhokkuszubzngrcamfdb.supabase.co";

      // Determine which email function to use based on SMTP setting
      let endpoint;
      
      if (useSmtp) {
        if (!smtpConfigured) {
          throw new Error("SMTP settings are not configured properly");
        }
        endpoint = `${supabaseUrl}/functions/v1/send-email-smtp`;
      } else {
        endpoint = `${supabaseUrl}/functions/v1/send-email`;
      }

      console.log(`Using email endpoint: ${endpoint} (SMTP: ${useSmtp}, Configured: ${smtpConfigured})`);

      // Send the message via the appropriate edge function
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          name: data.name,
          email: data.email,
          subject: subjectOptions.find(opt => opt.value === data.subject)?.label || data.subject,
          message: data.message
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send message');
      }

      toast({
        title: "Message sent",
        description: "Thank you for your message. We'll respond as soon as possible."
      });

      return true;
    } catch (error) {
      console.error("Error sending message:", error);
      toast({
        title: "Error",
        description: `Failed to send your message: ${error.message}`,
        variant: "destructive"
      });
      return false;
    } finally {
      setSubmitting(false);
    }
  };

  return {
    onSubmit,
    submitting,
    useSmtp,
    smtpConfigured
  };
}
