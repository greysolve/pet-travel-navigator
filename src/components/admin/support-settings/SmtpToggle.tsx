
import { FormField, FormItem, FormLabel, FormDescription, FormControl } from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import { UseFormReturn } from "react-hook-form";
import { SupportSettingsValues } from "./types";

interface SmtpToggleProps {
  form: UseFormReturn<SupportSettingsValues>;
}

export function SmtpToggle({ form }: SmtpToggleProps) {
  return (
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
  );
}
