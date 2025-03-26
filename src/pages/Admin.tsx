
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserManagement } from "@/components/admin/UserManagement";
import { PetPolicyUpdate } from "@/components/admin/PetPolicyUpdate";
import { SyncSection } from "@/components/admin/SyncSection";
import { CountryPolicyUpdate } from "@/components/admin/CountryPolicyUpdate";
import { AirlineDataManager } from "@/components/admin/AirlineDataManager";
import { SampleResultsManager } from "@/components/admin/SampleResultsManager";
import { PremiumFieldsManager } from "@/components/admin/PremiumFieldsManager";
import { PaymentPlansManager } from "@/components/admin/PaymentPlansManager";
import { SupportSettingsManager } from "@/components/admin/support-settings/SupportSettingsManager";
import { ManualSubscriptionUpdate } from "@/components/admin/ManualSubscriptionUpdate";

const Admin = () => {
  const [activeTab, setActiveTab] = useState("users");

  return (
    <div className="container mx-auto px-4 py-8 pt-[15vh] md:pt-8 max-w-full md:max-w-[90%]">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-8">
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="premium-fields">Premium Fields</TabsTrigger>
          <TabsTrigger value="payment-plans">Payment Plans</TabsTrigger>
          <TabsTrigger value="sync">Sync Data</TabsTrigger>
          <TabsTrigger value="pet-policies">Pet Policies</TabsTrigger>
          <TabsTrigger value="countries">Countries</TabsTrigger>
          <TabsTrigger value="airlines">Airlines</TabsTrigger>
          <TabsTrigger value="samples">Sample Results</TabsTrigger>
          <TabsTrigger value="support">Support Settings</TabsTrigger>
          <TabsTrigger value="subscriptions">Subscriptions</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="mt-6">
          <UserManagement />
        </TabsContent>

        <TabsContent value="premium-fields" className="mt-6">
          <PremiumFieldsManager />
        </TabsContent>

        <TabsContent value="payment-plans" className="mt-6">
          <PaymentPlansManager />
        </TabsContent>

        <TabsContent value="sync" className="mt-6">
          <SyncSection />
        </TabsContent>

        <TabsContent value="pet-policies" className="mt-6">
          <PetPolicyUpdate />
        </TabsContent>

        <TabsContent value="countries" className="mt-6">
          <CountryPolicyUpdate />
        </TabsContent>

        <TabsContent value="airlines" className="mt-6">
          <AirlineDataManager />
        </TabsContent>

        <TabsContent value="samples" className="mt-6">
          <SampleResultsManager />
        </TabsContent>

        <TabsContent value="support" className="mt-6">
          <SupportSettingsManager />
        </TabsContent>

        <TabsContent value="subscriptions" className="mt-6">
          <ManualSubscriptionUpdate />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Admin;
