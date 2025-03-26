
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Info, AlertCircle, CheckCircle, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const supportSettingsSchema = z.object({
  support_email: z.string().email({ message: "Please enter a valid email address." }),
  auto_reply_subject: z.string().min(1, { message: "Subject line is required." }),
  auto_reply_template: z.string().min(10, { message: "Template must be at least 10 characters." }),
  use_smtp: z.boolean().default(false),
  smtp_host: z.string().optional(),
  smtp_port: z.number().int().positive().optional(),
  smtp_username: z.string().optional(),
  smtp_password: z.string().optional(),
  smtp_from_email: z.string().email().optional(),
  smtp_from_name: z.string().optional(),
  smtp_secure: z.boolean().default(true)
});

type SupportSettingsValues = z.infer<typeof supportSettingsSchema>;

export function SupportSettingsManager() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [testingSmtp, setTestingSmtp] = useState(false);
  const [testResult, setTestResult] = useState<{success: boolean; message: string} | null>(null);
  const [settingsId, setSettingsId] = useState<string | null>(null);

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
      smtp_secure: true
    }
  });

  // Watch the use_smtp field to conditionally render SMTP settings
  const useSmtp = form.watch("use_smtp");
  const smtpHost = form.watch("smtp_host");
  const smtpPort = form.watch("smtp_port");
  const smtpUsername = form.watch("smtp_username");
  const smtpPassword = form.watch("smtp_password");
  const smtpFromEmail = form.watch("smtp_from_email");
  const smtpSecure = form.watch("smtp_secure");

  // Check if all required SMTP settings are filled
  const isSmtpConfigured = !!(
    smtpHost && 
    smtpPort && 
    smtpUsername && 
    smtpPassword &&
    smtpFromEmail
  );

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
            smtp_secure: settings.smtp_secure !== false // Default to true if not explicitly set to false
          });
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

      console.log("Testing SMTP connection to:", formData.smtp_host);
      
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
    } catch (error) {
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
          smtp_secure: formData.smtp_secure
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
    } catch (error) {
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

  if (loading) {
    return <p>Loading support settings...</p>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Support Settings</CardTitle>
        <CardDescription>
          Configure support email and auto-reply messages for the contact form.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="support_email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Support Email Address</FormLabel>
                  <FormControl>
                    <Input placeholder="support@example.com" {...field} />
                  </FormControl>
                  <FormDescription>
                    This is the email address where support requests will be sent.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="auto_reply_subject"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Auto-Reply Subject</FormLabel>
                  <FormControl>
                    <Input placeholder="Your message has been received" {...field} />
                  </FormControl>
                  <FormDescription>
                    Subject line for the automatic reply sent to users.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="auto_reply_template"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Auto-Reply Template</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Thank you for your message..." 
                      className="min-h-[150px]" 
                      {...field} 
                    />
                  </FormControl>
                  <FormDescription>
                    Use {"{{"} subject {"}}"} to include the message subject. HTML is not supported.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="border-t pt-6">
              <h3 className="text-lg font-medium mb-4">Email Sending Method</h3>
              
              <FormField
                control={form.control}
                name="use_smtp"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 mb-6">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Use SMTP Server</FormLabel>
                      <FormDescription>
                        When enabled, emails will be sent through your SMTP server instead of Resend.
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            {useSmtp && (
              <div className="space-y-6 border-t pt-6">
                <h3 className="text-lg font-medium mb-4">SMTP Configuration</h3>
                
                {testResult && (
                  <Alert 
                    variant={testResult.success ? "info" : "destructive"} 
                    className="mb-6"
                  >
                    {testResult.success ? (
                      <CheckCircle className="h-4 w-4" />
                    ) : (
                      <AlertCircle className="h-4 w-4" />
                    )}
                    <AlertTitle>{testResult.success ? "Test Successful" : "Test Failed"}</AlertTitle>
                    <AlertDescription>{testResult.message}</AlertDescription>
                  </Alert>
                )}
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="smtp_host"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>SMTP Host</FormLabel>
                        <FormControl>
                          <Input placeholder="smtp.example.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="smtp_port"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>SMTP Port</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            placeholder="587" 
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 587)}
                            value={field.value}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="smtp_username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>SMTP Username</FormLabel>
                        <FormControl>
                          <Input placeholder="username@example.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="smtp_password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>SMTP Password</FormLabel>
                        <FormControl>
                          <Input 
                            type="password" 
                            placeholder="••••••••" 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="smtp_from_email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>From Email Address</FormLabel>
                        <FormControl>
                          <Input placeholder="noreply@example.com" {...field} />
                        </FormControl>
                        <FormDescription>
                          The email address that will appear in the "From" field.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="smtp_from_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>From Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Support Team" {...field} />
                        </FormControl>
                        <FormDescription>
                          The name that will appear in the "From" field.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="smtp_secure"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Use Secure Connection (TLS)</FormLabel>
                        <FormDescription>
                          Enable TLS for secure SMTP connection. Usually required for port 465.
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                
                <div className="mt-6">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={testSmtpConnection}
                    disabled={testingSmtp || !isSmtpConfigured}
                    className="mr-4"
                  >
                    {testingSmtp ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Testing...
                      </>
                    ) : (
                      <>Test SMTP Connection</>
                    )}
                  </Button>
                  <FormDescription className="inline-block ml-2">
                    {!isSmtpConfigured && useSmtp ? 
                      "Complete all SMTP fields to enable testing" : ""}
                  </FormDescription>
                </div>
              </div>
            )}

            <Button type="submit" className="mt-6" disabled={updating}>
              {updating ? "Saving..." : "Save Settings"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
