
import { FormField, FormItem, FormLabel, FormControl, FormDescription, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { UseFormReturn } from "react-hook-form";
import { SupportSettingsValues } from "./types";

interface BasicSettingsFormProps {
  form: UseFormReturn<SupportSettingsValues>;
}

export function BasicSettingsForm({ form }: BasicSettingsFormProps) {
  return (
    <>
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
    </>
  );
}
