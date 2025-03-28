
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ApiProvider } from "@/config/feature-flags";

interface AppSettingsValue {
  provider: ApiProvider;
  enable_fallback: boolean;
}

interface AppSetting {
  id: string;
  key: string;
  value: AppSettingsValue;
  description?: string;
  created_at: string;
  updated_at: string;
}

export function useAppSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);

  // Fetch all app settings
  const { data: settings, isLoading: isLoadingSettings, error } = useQuery({
    queryKey: ["appSettings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("app_settings")
        .select("*");

      if (error) {
        console.error("Error fetching app settings:", error);
        throw error;
      }

      return data as AppSetting[];
    },
  });

  // Update an app setting
  const updateSettingMutation = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: any }) => {
      setIsLoading(true);
      
      const { data, error } = await supabase
        .from("app_settings")
        .update({ value })
        .eq("key", key)
        .select()
        .single();

      if (error) {
        console.error(`Error updating app setting ${key}:`, error);
        throw error;
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appSettings"] });
      toast({
        title: "Settings updated",
        description: "Application settings have been saved.",
      });
      setIsLoading(false);
    },
    onError: (error) => {
      toast({
        title: "Failed to update settings",
        description: "There was a problem saving your changes.",
        variant: "destructive",
      });
      console.error("Mutation error:", error);
      setIsLoading(false);
    },
  });

  // Get API provider settings
  const apiProviderSettings = settings?.find(setting => setting.key === 'api_provider');
  const apiProvider = apiProviderSettings?.value?.provider || 'amadeus';
  const enableFallback = apiProviderSettings?.value?.enable_fallback || false;

  // Update API provider settings
  const updateApiProvider = (provider: ApiProvider, enableFallback: boolean = false) => {
    updateSettingMutation.mutate({
      key: 'api_provider',
      value: { provider, enable_fallback: enableFallback }
    });
  };

  return {
    settings,
    isLoading: isLoadingSettings || isLoading,
    error,
    updateSetting: updateSettingMutation.mutate,
    apiProvider,
    enableFallback,
    updateApiProvider,
  };
}
