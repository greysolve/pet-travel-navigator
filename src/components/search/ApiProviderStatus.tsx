
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useAppSettings } from "@/hooks/useAppSettings";

export const ApiProviderStatus = ({ className }: { className?: string }) => {
  const { apiProvider, isLoading } = useAppSettings();
  
  if (isLoading) {
    return (
      <Badge variant="outline" className={className}>
        Loading API...
      </Badge>
    );
  }
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge 
            variant={apiProvider === 'amadeus' ? "default" : "secondary"}
            className={className}
          >
            {apiProvider === 'amadeus' ? 'Amadeus API' : 'Cirium API'}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p>Flight data powered by {apiProvider === 'amadeus' ? 'Amadeus' : 'Cirium'} API</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
