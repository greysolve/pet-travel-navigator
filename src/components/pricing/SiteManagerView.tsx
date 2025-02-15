
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { stripeApi } from "@/utils/stripeApi";

export const SiteManagerView = () => {
  const { toast } = useToast();
  const [isImporting, setIsImporting] = useState(false);

  const handleImportPlans = async () => {
    try {
      setIsImporting(true);
      const result = await stripeApi.importPlans();
      
      toast({
        title: "Success",
        description: result.message,
      });
    } catch (error) {
      console.error('Error importing plans:', error);
      toast({
        title: "Error",
        description: "Failed to import plans. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Payment Plans Management</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            As a site manager, you can import and manage payment plans from Stripe.
          </p>
          
          <Button 
            onClick={handleImportPlans} 
            disabled={isImporting}
            className="w-full"
          >
            {isImporting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Importing Plans...
              </>
            ) : (
              'Import Plans from Stripe'
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
