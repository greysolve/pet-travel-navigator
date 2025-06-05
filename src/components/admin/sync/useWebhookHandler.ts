
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

export const useWebhookHandler = () => {
  const { toast } = useToast();
  const [isWebhookLoading, setIsWebhookLoading] = useState(false);
  
  const handlePetPoliciesWebhook = (shouldClearData: boolean) => {
    const webhookUrl = "https://petjumper.app.n8n.cloud/webhook-test/50b1e027-2372-4cf1-95f4-b99f3d700d1e";
    
    setIsWebhookLoading(true);
    console.log('Triggering Pet Policies sync via n8n webhook');
    
    fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'pet_policies_sync',
        clearData: shouldClearData,
        timestamp: new Date().toISOString()
      }),
    })
    .then(response => {
      setIsWebhookLoading(false);
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      toast({
        title: "Pet Policies Sync Initiated",
        description: "The sync process has been triggered via external service.",
      });
      console.log('Webhook response:', response);
    })
    .catch(error => {
      setIsWebhookLoading(false);
      console.error('Error calling webhook:', error);
      toast({
        variant: "destructive",
        title: "Error Starting Sync",
        description: "Failed to trigger the sync process. The webhook service may be unavailable or misconfigured.",
      });
    });
  };
  
  return {
    isWebhookLoading,
    handlePetPoliciesWebhook
  };
};
