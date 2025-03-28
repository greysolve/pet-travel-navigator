
import { useEffect } from "react";
import { ApiProvider, DEFAULT_API_PROVIDER, ENABLE_API_PROVIDER_SELECTION } from "@/config/feature-flags";
import { InfoIcon } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

interface ApiProviderSelectorProps {
  apiProvider: ApiProvider;
  onChange: (provider: ApiProvider) => void;
  disabled?: boolean;
}

export const ApiProviderSelector = ({ 
  apiProvider, 
  onChange, 
  disabled = false 
}: ApiProviderSelectorProps) => {
  if (!ENABLE_API_PROVIDER_SELECTION) {
    return null;
  }

  useEffect(() => {
    console.log("Current API Provider:", apiProvider);
  }, [apiProvider]);

  return (
    <div className="flex flex-col gap-2 mb-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Data Provider:</span>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <InfoIcon className="h-4 w-4 text-gray-500" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p>Choose between Amadeus (modern) and Cirium (legacy) flight data providers</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      <ToggleGroup 
        type="single" 
        size="sm"
        variant="outline"
        className="border rounded-md p-1 bg-background" 
        value={apiProvider}
        onValueChange={(value) => {
          if (value) onChange(value as ApiProvider);
        }}
        disabled={disabled}
      >
        <ToggleGroupItem 
          value="amadeus" 
          className="flex-1 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground font-medium"
        >
          Amadeus
        </ToggleGroupItem>
        <ToggleGroupItem 
          value="cirium" 
          className="flex-1 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground font-medium"
        >
          Cirium
        </ToggleGroupItem>
      </ToggleGroup>
    </div>
  );
};
