
import { Switch } from "@/components/ui/switch";
import { ApiProvider, DEFAULT_API_PROVIDER, ENABLE_API_PROVIDER_SELECTION } from "@/config/feature-flags";
import { InfoIcon } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

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

  const isAmadeus = apiProvider === 'amadeus';

  return (
    <div className="flex items-center space-x-2 mb-4">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">Use Amadeus API:</span>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <InfoIcon className="h-4 w-4 text-gray-500" />
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <p>Toggle between Amadeus (modern) and Cirium (legacy) flight data providers</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <Switch
          id="api-provider"
          checked={isAmadeus}
          onCheckedChange={(checked) => onChange(checked ? 'amadeus' : 'cirium')}
          disabled={disabled}
        />
      </div>
    </div>
  );
};
