
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent, CardFooter, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { isTestMode } from "@/config/stripe";

export function ManualSubscriptionUpdate() {
  const { toast } = useToast();
  const [userId, setUserId] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isTestEnvironment, setIsTestEnvironment] = useState(() => isTestMode());
  const [result, setResult] = useState<string | null>(null);

  const handleFixSubscription = async () => {
    if (!userId) {
      toast({
        title: "Error",
        description: "Please enter a user ID",
        variant: "destructive"
      });
      return;
    }
    
    try {
      setIsLoading(true);
      setResult(null);
      
      const { data, error } = await supabase.functions.invoke("fix-subscriptions", {
        body: {
          action: "fix-user-subscription",
          userId,
          environment: isTestEnvironment ? 'test' : 'production'
        }
      });
      
      if (error) throw error;
      
      setResult(JSON.stringify(data, null, 2));
      
      if (data.success) {
        toast({
          title: "Success",
          description: data.message
        });
      } else {
        toast({
          title: "Action completed",
          description: `Result: ${data.message}`,
          variant: "default"
        });
      }
    } catch (error) {
      console.error("Error fixing subscription:", error);
      toast({
        title: "Error",
        description: "Failed to fix subscription. See console for details.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGetPaymentPlans = async () => {
    try {
      setIsLoading(true);
      setResult(null);
      
      const { data, error } = await supabase.functions.invoke("fix-subscriptions", {
        body: {
          action: "list-payment-plans",
          environment: isTestEnvironment ? 'test' : 'production'
        }
      });
      
      if (error) throw error;
      
      setResult(JSON.stringify(data.plans, null, 2));
    } catch (error) {
      console.error("Error fetching payment plans:", error);
      toast({
        title: "Error",
        description: "Failed to fetch payment plans. See console for details.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Manual Subscription Management</CardTitle>
        <CardDescription>Fix subscription issues for specific users</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2">
          <Switch
            checked={isTestEnvironment}
            onCheckedChange={setIsTestEnvironment}
            id="test-mode"
          />
          <Label htmlFor="test-mode">
            Test Mode: {isTestEnvironment ? "Enabled" : "Disabled"}
          </Label>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="user-id">User ID</Label>
          <Input
            id="user-id"
            placeholder="Enter user ID"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
          />
        </div>
        
        <div className="flex flex-col gap-4 mt-4">
          <Button 
            onClick={handleFixSubscription}
            disabled={isLoading || !userId}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              "Fix User Subscription"
            )}
          </Button>
          
          <Button 
            variant="outline"
            onClick={handleGetPaymentPlans}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading...
              </>
            ) : (
              "List Payment Plans"
            )}
          </Button>
        </div>
        
        {result && (
          <div className="mt-4">
            <Label>Result:</Label>
            <pre className="bg-slate-100 p-4 rounded-md text-xs overflow-auto mt-2 max-h-60">
              {result}
            </pre>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
