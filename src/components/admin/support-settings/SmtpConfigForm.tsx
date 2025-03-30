
import { FormField, FormItem, FormLabel, FormControl, FormDescription, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Info } from "lucide-react";
import { UseFormReturn } from "react-hook-form";
import { SupportSettingsValues } from "./types";

interface SmtpConfigFormProps {
  form: UseFormReturn<SupportSettingsValues>;
  smtpSecurity: string;
}

export function SmtpConfigForm({ form, smtpSecurity }: SmtpConfigFormProps) {
  return (
    <>
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
              <FormDescription>
                {smtpSecurity === "tls" ? "Common TLS port: 587" : 
                 smtpSecurity === "ssl" ? "Common SSL port: 465" : 
                 "Common non-secure port: 25"}
              </FormDescription>
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
              <FormDescription>
                Usually your full email address
              </FormDescription>
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
        name="smtp_security"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Connection Security</FormLabel>
            <Select
              onValueChange={field.onChange}
              defaultValue={field.value}
              value={field.value}
            >
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Select security type" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="tls">TLS (usually port 587)</SelectItem>
                <SelectItem value="ssl">SSL (usually port 465)</SelectItem>
                <SelectItem value="none">None (not recommended)</SelectItem>
              </SelectContent>
            </Select>
            <FormDescription>
              Select the appropriate security type for your SMTP server.
              The recommended port will update automatically.
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
      
      <Alert variant="info" className="mt-4">
        <Info className="h-4 w-4" />
        <AlertTitle>Email Provider Security</AlertTitle>
        <AlertDescription>
          <p>Most modern email providers require a secure connection:</p>
          <ul className="list-disc list-inside mt-2 space-y-1">
            <li><strong>TLS</strong> - Typically uses port 587 (recommended)</li>
            <li><strong>SSL</strong> - Typically uses port 465</li>
            <li>Port selection should match your security setting</li>
          </ul>
        </AlertDescription>
      </Alert>
    </>
  );
}
