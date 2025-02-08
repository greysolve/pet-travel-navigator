
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AirlineDataManager } from "@/components/admin/AirlineDataManager";
import { SyncSection } from "@/components/admin/SyncSection";
import PetPolicyUpdate from "@/components/admin/PetPolicyUpdate";
import CountryPolicyUpdate from "@/components/admin/CountryPolicyUpdate";
import UserManagement from "@/components/admin/UserManagement";
import SampleResultsManager from "@/components/admin/SampleResultsManager";
import { PageLayout } from "@/components/layout/PageLayout";

const Admin = () => {
  return (
    <PageLayout>
      <h1 className="text-4xl font-bold mb-8">Admin Dashboard</h1>
      
      <Tabs defaultValue="sync" className="space-y-8">
        <TabsList>
          <TabsTrigger value="sync">Data Sync</TabsTrigger>
          <TabsTrigger value="airlines">Airline Data</TabsTrigger>
          <TabsTrigger value="pet-policies">Pet Policies</TabsTrigger>
          <TabsTrigger value="country-policies">Country Policies</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="sample-results">Sample Results</TabsTrigger>
        </TabsList>

        <TabsContent value="sync">
          <SyncSection />
        </TabsContent>

        <TabsContent value="airlines">
          <AirlineDataManager />
        </TabsContent>

        <TabsContent value="pet-policies">
          <PetPolicyUpdate />
        </TabsContent>

        <TabsContent value="country-policies">
          <CountryPolicyUpdate />
        </TabsContent>

        <TabsContent value="users">
          <UserManagement />
        </TabsContent>

        <TabsContent value="sample-results">
          <SampleResultsManager />
        </TabsContent>
      </Tabs>
    </PageLayout>
  );
};

export default Admin;
