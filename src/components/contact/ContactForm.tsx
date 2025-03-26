
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/contexts/ProfileContext";
import { supabase } from "@/integrations/supabase/client";

// Define form schema
const contactFormSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  email: z.string().email({ message: "Please enter a valid email address." }),
  subject: z.string().min(1, { message: "Please select a subject." }),
  message: z.string().min(10, { message: "Message must be at least 10 characters." })
});

type ContactFormValues = z.infer<typeof contactFormSchema>;

// Subject options
const subjectOptions = [
  { value: "search", label: "Search Feature Question" },
  { value: "account", label: "Issue with my account" },
  { value: "billing", label: "Billing Question" },
  { value: "feedback", label: "Feedback & Suggestions" },
  { value: "other", label: "Other" }
];

export function ContactForm() {
  const { toast } = useToast();
  const { user } = useAuth();
  const { profile, updateProfile } = useProfile();
  const [submitting, setSubmitting] = useState(false);
  const [useSmtp, setUseSmtp] = useState(false);

  const form = useForm<ContactFormValues>({
    resolver: zodResolver(contactFormSchema),
    defaultValues: {
      name: "",
      email: "",
      subject: "",
      message: ""
    }
  });

  // Fill form with profile data when available
  useEffect(() => {
    if (profile) {
      form.setValue("name", profile.full_name || "");
      if (user?.email) {
        form.setValue("email", user.email);
      }
    }
  }, [profile, user, form]);

  // Check if SMTP is configured on component mount
  useEffect(() => {
    const checkSmtpSettings = async () => {
      try {
        const { data } = await supabase
          .from('support_settings')
          .select('use_smtp')
          .limit(1)
          .single();
        
        if (data && data.use_smtp) {
          setUseSmtp(true);
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

      // Get the Supabase URL from environment variables
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      if (!supabaseUrl) {
        throw new Error('VITE_SUPABASE_URL is not defined');
      }

      // Determine which email function to use based on SMTP setting
      const endpoint = useSmtp 
        ? `${supabaseUrl}/functions/v1/send-email-smtp`
        : `${supabaseUrl}/functions/v1/send-email`;

      console.log(`Using email endpoint: ${endpoint} (SMTP: ${useSmtp})`);

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

      // Reset form fields except name and email
      form.setValue("subject", "");
      form.setValue("message", "");
    } catch (error) {
      console.error("Error sending message:", error);
      toast({
        title: "Error",
        description: `Failed to send your message: ${error.message}`,
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Your Name</FormLabel>
                <FormControl>
                  <Input placeholder="Enter your name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email Address</FormLabel>
                <FormControl>
                  <Input placeholder="Enter your email" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="subject"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Subject</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a subject" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {subjectOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="message"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Message</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Describe your question or issue" 
                  className="min-h-[150px]" 
                  {...field} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting ? "Sending..." : "Send Message"}
        </Button>
      </form>
    </Form>
  );
}
