
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { WandSparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface SmartUpdateSectionProps {
  onSmartUpdate: (batchSize: number) => void;
  isLoading: boolean;
}

export const SmartUpdateSection = ({ onSmartUpdate, isLoading }: SmartUpdateSectionProps) => {
  const { toast } = useToast();
  const [smartUpdateBatchSize, setSmartUpdateBatchSize] = useState<number>(25);
  
  const handleSmartUpdate = () => {
    if (smartUpdateBatchSize <= 0) {
      toast({
        variant: "destructive",
        title: "Invalid Batch Size",
        description: "Please enter a positive number for the batch size.",
      });
      return;
    }
    
    onSmartUpdate(smartUpdateBatchSize);
  };
  
  return (
    <div className="mb-8 border p-4 rounded-lg space-y-4">
      <h3 className="text-lg font-semibold">Smart Update Pet Policies</h3>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
        <div className="md:col-span-3">
          <div className="flex items-center gap-2">
            <span className="text-sm whitespace-nowrap">Batch Size:</span>
            <Input
              type="number"
              min="1"
              max="100"
              value={smartUpdateBatchSize}
              onChange={(e) => setSmartUpdateBatchSize(parseInt(e.target.value) || 25)}
              className="w-24"
            />
            <span className="text-xs text-muted-foreground">
              (Recommended: 25-50 airlines per batch)
            </span>
          </div>
        </div>
        <Button 
          variant="outline" 
          className="border-dashed border-2 h-full"
          onClick={handleSmartUpdate}
          disabled={isLoading}
        >
          <WandSparkles className="mr-2" />
          Run Smart Update
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Smart Update analyzes airline websites and prioritizes those with pet policies that need updating.
        The improved algorithm identifies specific pet policy URLs and ensures more accurate updates.
      </p>
    </div>
  );
};
