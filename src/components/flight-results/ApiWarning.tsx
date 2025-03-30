
import React from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";

interface ApiWarningProps {
  message: string;
}

export const ApiWarning = ({ message }: ApiWarningProps) => {
  if (!message) return null;
  
  return (
    <Alert variant="info" className="mb-4">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>API Warning</AlertTitle>
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
};
