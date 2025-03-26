
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/contexts/ProfileContext";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, Info } from "lucide-react";
import { contactFormSchema, ContactFormValues } from "./form-schema";
import { ContactNameField } from "./ContactNameField";
import { ContactEmailField } from "./ContactEmailField";
import { ContactSubjectField } from "./ContactSubjectField";
import { ContactMessageField } from "./ContactMessageField";
import { useContactFormSubmit } from "./useContactFormSubmit";

export function ContactForm() {
  const { user } = useAuth();
  const { profile } = useProfile();
  const { onSubmit, submitting, useSmtp, smtpConfigured } = useContactFormSubmit();

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

  const handleSubmit = async (data: ContactFormValues) => {
    const success = await onSubmit(data);
    if (success) {
      // Reset form fields except name and email
      form.setValue("subject", "");
      form.setValue("message", "");
    }
  };

  // Show a warning if SMTP is enabled but not properly configured
  const showSmtpWarning = useSmtp && !smtpConfigured;

  return (
    <>
      {showSmtpWarning && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>SMTP Configuration Issue</AlertTitle>
          <AlertDescription>
            SMTP is enabled but not properly configured. Please check the SMTP settings in the admin panel.
            <br />
            <span className="font-semibold">Note for administrators:</span> Use the Test SMTP button in the admin panel to diagnose the issue.
          </AlertDescription>
        </Alert>
      )}
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <ContactNameField form={form} />
            <ContactEmailField form={form} />
          </div>

          <ContactSubjectField form={form} />
          <ContactMessageField form={form} />

          <Button type="submit" className="w-full" disabled={submitting || showSmtpWarning}>
            {submitting ? "Sending..." : "Send Message"}
          </Button>
        </form>
      </Form>
    </>
  );
}
