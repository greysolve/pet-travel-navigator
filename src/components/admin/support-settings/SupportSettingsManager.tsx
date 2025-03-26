
import { Form } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useSupportSettings } from "./useSupportSettings";
import { BasicSettingsForm } from "./BasicSettingsForm";
import { SmtpToggle } from "./SmtpToggle";
import { SmtpTestStatus } from "./SmtpTestStatus";
import { EmailProviderSelector } from "./EmailProviderSelector";
import { SmtpConfigForm } from "./SmtpConfigForm";
import { SmtpTestButton } from "./SmtpTestButton";

export function SupportSettingsManager() {
  const {
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
  } = useSupportSettings();

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
            {/* Basic settings section */}
            <BasicSettingsForm form={form} />

            <Separator className="my-6" />
            
            {/* SMTP toggle section */}
            <div>
              <h3 className="text-lg font-medium mb-4">Email Sending Method</h3>
              <SmtpToggle form={form} />
            </div>

            {useSmtp && (
              <div className="space-y-6 border-t pt-6">
                <h3 className="text-lg font-medium mb-4">SMTP Configuration</h3>
                
                {/* SMTP test status message */}
                <SmtpTestStatus testResult={testResult} />
                
                {/* Email provider selector */}
                <EmailProviderSelector 
                  selectedProvider={selectedProvider} 
                  onProviderSelect={handleProviderSelect} 
                />
                
                {/* SMTP configuration form */}
                <SmtpConfigForm form={form} smtpSecurity={smtpSecurity} />
                
                {/* SMTP test button */}
                <SmtpTestButton 
                  testingSmtp={testingSmtp} 
                  isSmtpConfigured={isSmtpConfigured} 
                  onTestSmtp={testSmtpConnection} 
                />
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
