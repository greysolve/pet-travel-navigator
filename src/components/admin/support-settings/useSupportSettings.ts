
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { SupportSettingsValues, supportSettingsSchema, SmtpSecurityType, emailProviders } from "./types";

export function useSupportSettings() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [testingSmtp, setTestingSmtp] = useState(false);
  const [testResult, setTestResult] = useState<{success: boolean; message: string} | null>(null);
  const [settingsId, setSettingsId] = useState<string | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);

  const form = useForm<SupportSettingsValues>({
    resolver: zodResolver(supportSettingsSchema),
    defaultValues: {
      support_email: "",
      auto_reply_subject: "",
      auto_reply_template: "",
      use_smtp: false,
      smtp_host: "",
      smtp_port: 587,
      smtp_username: "",
      smtp_password: "",
      smtp_from_email: "",
      smtp_from_name: "",
      smtp_security: "tls"
    }
  });

  // Watch the necessary fields
  const useSmtp = form.watch("use_smtp");
  const smtpHost = form.watch("smtp_host");
  const smtpPort = form.watch("smtp_port");
  const smtpUsername = form.watch("smtp_username");
  const smtpPassword = form.watch("smtp_password");
  const smtpFromEmail = form.watch("smtp_from_email");
  const smtpSecurity = form.watch("smtp_security");

  // Check if all required SMTP settings are filled
  const isSmtpConfigured = !!(
    smtpHost && 
    smtpPort && 
    smtpUsername && 
    smtpPassword &&
    smtpFromEmail
  );

  // Update port based on security selection
  useEffect(() => {
    if (selectedProvider && smtpSecurity) {
      const provider = emailProviders.find(p => p.name === selectedProvider);
      if (provider) {
        const recommendedPort = provider.ports[smtpSecurity as keyof typeof provider.ports];
        if (recommendedPort) {
          form.setValue("smtp_port", recommendedPort);
        }
      }
    }
  }, [selectedProvider, smtpSecurity, form]);

  useEffect(() => {
    async function fetchSettings() {
      try {
        const { data, error } = await supabase
          .from('support_settings')
          .select('*')
          .limit(1);

        if (error) {
          throw error;
        }

        if (data && data.length > 0) {
          const settings = data[0];
          setSettingsId(settings.id);
          
          // Now directly use the smtp_security field if available, or fall back to the old method
          let securityType: SmtpSecurityType = "tls";
          if (settings.smtp_security) {
            // Use the new field directly
            securityType = settings.smtp_security as SmtpSecurityType;
          } else if (settings.smtp_secure === false) {
            securityType = "none";
          } else if (settings.smtp_port === 465) {
            securityType = "ssl";
          }
          
          form.reset({
            support_email: settings.support_email,
            auto_reply_subject: settings.auto_reply_subject,
            auto_reply_template: settings.auto_reply_template,
            use_smtp: settings.use_smtp || false,
            smtp_host: settings.smtp_host || "",
            smtp_port: settings.smtp_port || 587,
            smtp_username: settings.smtp_username || "",
            smtp_password: settings.smtp_password || "",
            smtp_from_email: settings.smtp_from_email || "",
            smtp_from_name: settings.smtp_from_name || "",
            smtp_security: securityType
          });
          
          // Check if the current host matches any of our predefined providers
          if (settings.smtp_host) {
            const matchedProvider = emailProviders.find(
              provider => provider.host.toLowerCase() === settings.smtp_host?.toLowerCase()
            );
            if (matchedProvider) {
              setSelectedProvider(matchedProvider.name);
            } else {
              setSelectedProvider(null);
            }
          }
        }
      } catch (error) {
        console.error("Error fetching support settings:", error);
        toast({
          title: "Error",
          description: "Failed to load support settings.",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    }

    fetchSettings();
  }, [form, toast]);

  const testSmtpConnection = async () => {
    // Clear previous test results
    setTestResult(null);
    setTestingSmtp(true);
    
    try {
      // Get form values
      const formData = form.getValues();
      
      if (!formData.use_smtp || !isSmtpConfigured) {
        throw new Error("SMTP settings are not fully configured");
      }

      // Get the Supabase JWT for authorization
      const { data: authData } = await supabase.auth.getSession();
      const accessToken = authData.session?.access_token || '';
      
      // Use the hardcoded Supabase URL from the client file
      const supabaseUrl = "https://jhokkuszubzngrcamfdb.supabase.co";
      const testEndpoint = `${supabaseUrl}/functions/v1/send-email-smtp`;

      console.log(`Testing SMTP connection to: ${formData.smtp_host} with security: ${formData.smtp_security}`);
      
      // Send a test email using the SMTP settings
      const response = await fetch(testEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          to: formData.support_email,
          subject: "SMTP Test Email",
          html: "<p>This is a test email to verify your SMTP settings.</p>"
        })
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || "Failed to send test email");
      }

      setTestResult({
        success: true,
        message: "SMTP test successful! A test email has been sent to your support email address."
      });
      
      toast({
        title: "SMTP Test Successful",
        description: "Your SMTP settings are working correctly.",
      });
    } catch (error: any) {
      console.error("SMTP test error:", error);
      
      setTestResult({
        success: false,
        message: `SMTP test failed: ${error.message}`
      });
      
      toast({
        title: "SMTP Test Failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setTestingSmtp(false);
    }
  };

  const handleProviderSelect = (providerName: string) => {
    setSelectedProvider(providerName);
    const provider = emailProviders.find(p => p.name === providerName);
    if (provider) {
      form.setValue("smtp_host", provider.host);
      
      // Set appropriate port based on security setting
      const security = form.getValues("smtp_security");
      const portKey = security as keyof typeof provider.ports;
      if (provider.ports[portKey]) {
        form.setValue("smtp_port", provider.ports[portKey] || 587);
      }
    }
  };

  const onSubmit = async (data: SupportSettingsValues) => {
    if (!settingsId) return;

    setUpdating(true);
    try {
      // If not using SMTP, clear the SMTP fields
      const formData = { ...data };
      if (!formData.use_smtp) {
        formData.smtp_host = null;
        formData.smtp_port = null;
        formData.smtp_username = null;
        formData.smtp_password = null;
        formData.smtp_from_email = null;
        formData.smtp_from_name = null;
      }

      // Set the smtp_secure flag for backward compatibility
      // while also saving the new smtp_security field
      let smtp_secure: boolean;
      switch (formData.smtp_security) {
        case "none":
          smtp_secure = false;
          break;
        case "ssl":
        case "tls":
        default:
          smtp_secure = true;
          break;
      }

      const { error } = await supabase
        .from('support_settings')
        .update({
          support_email: formData.support_email,
          auto_reply_subject: formData.auto_reply_subject,
          auto_reply_template: formData.auto_reply_template,
          use_smtp: formData.use_smtp,
          smtp_host: formData.smtp_host,
          smtp_port: formData.smtp_port,
          smtp_username: formData.smtp_username,
          smtp_password: formData.smtp_password,
          smtp_from_email: formData.smtp_from_email,
          smtp_from_name: formData.smtp_from_name,
          smtp_secure: smtp_secure,
          smtp_security: formData.smtp_security // Store the new security type
        })
        .eq('id', settingsId);

      if (error) {
        throw error;
      }

      // Clear test result after saving
      setTestResult(null);

      toast({
        title: "Settings updated",
        description: "Support settings have been updated successfully."
      });
    } catch (error: any) {
      console.error("Error updating support settings:", error);
      toast({
        title: "Error",
        description: "Failed to update support settings.",
        variant: "destructive"
      });
    } finally {
      setUpdating(false);
    }
  };

  return {
    form,
    loading,
    updating,
    testingSmtp,
    testResult,
    useSmtp,
    isSmtpConfigured,
    selectedProvider,
    smtpSecurity,
    onSubmit,
    testSmtpConnection,
    handleProviderSelect
  };
}
