
import { Button } from "@/components/ui/button";
import { FormDescription } from "@/components/ui/form";
import { Loader2 } from "lucide-react";

interface SmtpTestButtonProps {
  testingSmtp: boolean;
  isSmtpConfigured: boolean;
  onTestSmtp: () => void;
}

export function SmtpTestButton({ testingSmtp, isSmtpConfigured, onTestSmtp }: SmtpTestButtonProps) {
  return (
    <div className="mt-6">
      <Button 
        type="button" 
        variant="outline" 
        onClick={onTestSmtp}
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
        {!isSmtpConfigured ? 
          "Complete all SMTP fields to enable testing" : ""}
      </FormDescription>
    </div>
  );
}
