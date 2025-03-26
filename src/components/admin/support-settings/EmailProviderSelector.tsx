
import { FormItem, FormLabel, FormControl, FormDescription } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { emailProviders } from "./types";

interface EmailProviderSelectorProps {
  selectedProvider: string | null;
  onProviderSelect: (providerName: string) => void;
}

export function EmailProviderSelector({ selectedProvider, onProviderSelect }: EmailProviderSelectorProps) {
  return (
    <div className="mb-6">
      <FormItem>
        <FormLabel>Email Provider Presets (Optional)</FormLabel>
        <Select
          onValueChange={onProviderSelect}
          value={selectedProvider || ""}
        >
          <FormControl>
            <SelectTrigger>
              <SelectValue placeholder="Select a provider or enter details manually" />
            </SelectTrigger>
          </FormControl>
          <SelectContent>
            {emailProviders.map((provider) => (
              <SelectItem key={provider.name} value={provider.name}>
                {provider.description}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <FormDescription>
          Select a common email provider to automatically fill the server details, or enter manually below.
        </FormDescription>
      </FormItem>
    </div>
  );
}
