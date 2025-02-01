import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AirlineDataManager } from "@/components/admin/AirlineDataManager";
import { SyncSection } from "@/components/admin/SyncSection";

const Admin = () => {
  return (
    <div className="container mx-auto p-8">
      <h1 className="text-4xl font-bold mb-8">Admin Dashboard</h1>
      
      <Tabs defaultValue="sync" className="space-y-8">
        <TabsList>
          <TabsTrigger value="sync">Data Sync</TabsTrigger>
          <TabsTrigger value="airlines">Airline Data</TabsTrigger>
        </TabsList>

        <TabsContent value="sync">
          <SyncSection />
        </TabsContent>

        <TabsContent value="airlines">
          <AirlineDataManager />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Admin;