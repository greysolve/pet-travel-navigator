
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const supportSettingsSchema = z.object({
  support_email: z.string().email({ message: "Please enter a valid email address." }),
  auto_reply_subject: z.string().min(1, { message: "Subject line is required." }),
  auto_reply_template: z.string().min(10, { message: "Template must be at least 10 characters." })
});

type SupportSettingsValues = z.infer<typeof supportSettingsSchema>;

export function SupportSettingsManager() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [settingsId, setSettingsId] = useState<string | null>(null);

  const form = useForm<SupportSettingsValues>({
    resolver: zodResolver(supportSettingsSchema),
    defaultValues: {
      support_email: "",
      auto_reply_subject: "",
      auto_reply_template: ""
    }
  });

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
            auto_reply_template: settings.auto_reply_template
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

  const onSubmit = async (data: SupportSettingsValues) => {
    if (!settingsId) return;

    setUpdating(true);
    try {
      const { error } = await supabase
        .from('support_settings')
        .update({
          support_email: data.support_email,
          auto_reply_subject: data.auto_reply_subject,
          auto_reply_template: data.auto_reply_template,
        })
        .eq('id', settingsId);

      if (error) {
        throw error;
      }

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
                    Use {{subject}} to include the message subject. HTML is not supported.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" disabled={updating}>
              {updating ? "Saving..." : "Save Settings"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
