
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, CheckCircle } from "lucide-react";

interface SmtpTestStatusProps {
  testResult: {
    success: boolean;
    message: string;
  } | null;
}

export function SmtpTestStatus({ testResult }: SmtpTestStatusProps) {
  if (!testResult) return null;
  
  return (
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
  );
}
