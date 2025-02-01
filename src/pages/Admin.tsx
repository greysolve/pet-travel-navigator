import { useState, useEffect } from "react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AirlineDataManager } from "@/components/admin/AirlineDataManager";
import { SyncSection } from "@/components/admin/SyncSection";

const Admin = () => {
  const [isLoading, setIsLoading] = useState<{[key: string]: boolean}>({});
  const [syncProgress, setSyncProgress] = useState<{
    [key: string]: {
      total: number;
      processed: number;
      lastProcessed: string | null;
      processedItems: string[];
      errorItems: string[];
      startTime: string | null;
      isComplete: boolean;
    };
  }>({});

  // Fetch existing sync progress on mount and periodically
  useEffect(() => {
    const fetchProgress = async () => {
      console.log('Fetching sync progress...');
      const { data, error } = await supabase
        .from('sync_progress')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching sync progress:', error);
        return;
      }

      console.log('Received sync progress data:', data);

      // Group by type and get the most recent for each
      const progressByType = data.reduce((acc, curr) => {
        if (!acc[curr.type] || new Date(curr.created_at) > new Date(acc[curr.type].created_at)) {
          acc[curr.type] = {
            total: curr.total,
            processed: curr.processed,
            lastProcessed: curr.last_processed,
            processedItems: curr.processed_items || [],
            errorItems: curr.error_items || [],
            startTime: curr.start_time,
            isComplete: curr.is_complete,
            created_at: curr.created_at
          };
        }
        return acc;
      }, {});

      console.log('Processed sync progress by type:', progressByType);
      setSyncProgress(progressByType);
    };

    // Fetch immediately
    fetchProgress();

    // Set up polling every 5 seconds
    const interval = setInterval(fetchProgress, 5000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-4xl font-bold mb-8">Admin Dashboard</h1>
      
      <Tabs defaultValue="sync" className="space-y-8">
        <TabsList>
          <TabsTrigger value="sync">Data Sync</TabsTrigger>
          <TabsTrigger value="airlines">Airline Data</TabsTrigger>
        </TabsList>

        <TabsContent value="sync">
          <SyncSection syncProgress={syncProgress} isLoading={isLoading} />
        </TabsContent>

        <TabsContent value="airlines">
          <AirlineDataManager />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Admin;