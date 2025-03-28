
import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ApiProvider, DEFAULT_API_PROVIDER, ENABLE_API_PROVIDER_SELECTION } from "@/config/feature-flags";
import { InfoCircledIcon } from "@radix-ui/react-icons";
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
    <div className="flex items-center justify-end space-x-2 text-xs text-gray-500">
      <div className="flex items-center gap-2">
        <Label htmlFor="api-provider" className="text-xs cursor-pointer">
          Use Amadeus API
        </Label>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <InfoCircledIcon className="h-3.5 w-3.5 text-gray-400" />
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
