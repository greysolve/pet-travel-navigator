
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { isTestMode } from "@/config/stripe";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/components/ui/use-toast";
import { Badge } from "@/components/ui/badge";

interface PaymentPlan {
  id: string;
  name: string;
  description: string | null;
  price: number;
  currency: string;
  stripe_price_id: string | null;
  features: any[] | null;
  created_at: string;
  updated_at: string;
}

export function PaymentPlansManager() {
  const { toast } = useToast();
  const [isImporting, setIsImporting] = useState(false);
  const [isTestEnvironment, setIsTestEnvironment] = useState(() => {
    // Initialize based on current Stripe configuration
    return isTestMode();
  });

  // Store environment preference
  useEffect(() => {
    localStorage.setItem('stripe-environment', isTestEnvironment ? 'test' : 'production');
  }, [isTestEnvironment]);

  // Fetch existing payment plans
  const { data: plans, refetch: refetchPlans } = useQuery({
    queryKey: ["payment-plans", isTestEnvironment],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payment_plans")
        .select("*")
        .order("price");
      if (error) throw error;
      return data as PaymentPlan[];
    },
  });

  // Import plans from Stripe
  const importStripePlans = async () => {
    try {
      setIsImporting(true);
      const { error } = await supabase.functions.invoke("stripe", {
        body: { 
          action: "import-plans",
          environment: isTestEnvironment ? 'test' : 'production'
        },
      });
      
      if (error) throw error;
      
      await refetchPlans();
      toast({
        title: "Success",
        description: "Payment plans imported successfully",
      });
    } catch (error) {
      console.error("Import error:", error);
      toast({
        title: "Error",
        description: "Failed to import payment plans",
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-bold">Payment Plans</h2>
          <Badge variant={isTestEnvironment ? "secondary" : "default"}>
            {isTestEnvironment ? "Test Mode" : "Production Mode"}
          </Badge>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Switch
              checked={isTestEnvironment}
              onCheckedChange={setIsTestEnvironment}
              aria-label="Toggle Stripe environment"
            />
            <span className="text-sm text-muted-foreground">
              Test Mode
            </span>
          </div>
          <Button
            onClick={importStripePlans}
            disabled={isImporting}
          >
            {isImporting ? "Importing..." : "Import from Stripe"}
          </Button>
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Description</TableHead>
            <TableHead>Price</TableHead>
            <TableHead>Currency</TableHead>
            <TableHead>Stripe Price ID</TableHead>
            <TableHead>Last Updated</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {plans?.map((plan) => (
            <TableRow key={plan.id}>
              <TableCell>{plan.name}</TableCell>
              <TableCell>{plan.description}</TableCell>
              <TableCell>{plan.price}</TableCell>
              <TableCell>{plan.currency}</TableCell>
              <TableCell>{plan.stripe_price_id}</TableCell>
              <TableCell>
                {new Date(plan.updated_at).toLocaleDateString()}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
