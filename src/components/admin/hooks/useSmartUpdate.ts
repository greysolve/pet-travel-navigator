
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

export const useSmartUpdate = () => {
  const { toast } = useToast();

  const getAirlinesNeedingUpdate = async () => {
    try {
      const { data, error } = await supabase.rpc('get_airlines_needing_policy_update');
      
      if (error) {
        throw new Error(`Failed to get airlines needing updates: ${error.message}`);
      }
      
      if (data && Array.isArray(data) && data.length > 0) {
        return data.map(item => item.id);
      } else {
        toast({
          title: "No Updates Needed",
          description: "No airlines were found that need policy updates at this time."
        });
        return null;
      }
    } catch (error) {
      console.error('Error getting airlines needing updates:', error);
      toast({
        variant: "destructive",
        title: "Smart Update Error",
        description: error instanceof Error ? error.message : "Failed to get airlines needing updates"
      });
      return null;
    }
  };

  return { getAirlinesNeedingUpdate };
};
