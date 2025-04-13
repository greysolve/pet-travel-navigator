
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import UserManagement from "@/components/admin/UserManagement";
import PetPolicyUpdate from "@/components/admin/PetPolicyUpdate";
import { SyncSection } from "@/components/admin/SyncSection";
import CountryPolicyUpdate from "@/components/admin/CountryPolicyUpdate";
import { AirlineDataManager } from "@/components/admin/AirlineDataManager";
import SampleResultsManager from "@/components/admin/SampleResultsManager";
import { PremiumFieldsManager } from "@/components/admin/PremiumFieldsManager";
import { PaymentPlansManager } from "@/components/admin/PaymentPlansManager";
import { SupportSettingsManager } from "@/components/admin/support-settings/SupportSettingsManager";
import { ManualSubscriptionUpdate } from "@/components/admin/ManualSubscriptionUpdate";
import { ApiProviderSelector } from "@/components/search/ApiProviderSelector";
import { ApiProvider } from "@/config/feature-flags";
import { useAppSettings } from "@/hooks/useAppSettings";
import { Card } from "@/components/ui/card";

const Admin = () => {
  const [activeTab, setActiveTab] = useState("users");
  const { 
    apiProvider, 
    enableFallback, 
    updateApiProvider, 
    isLoading: isAppSettingsLoading 
  } = useAppSettings();

  const handleProviderChange = (provider: ApiProvider) => {
    updateApiProvider(provider, enableFallback);
  };

  const handleFallbackChange = (fallbackEnabled: boolean) => {
    updateApiProvider(apiProvider, fallbackEnabled);
  };

  return (
    <div className="container mx-auto px-4 py-8 pt-[15vh] md:pt-8 max-w-full md:max-w-[90%]">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-9">
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
          <TabsTrigger value="api-settings">API Settings</TabsTrigger>
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

        <TabsContent value="api-settings" className="mt-6">
          <div className="p-4 bg-white rounded-lg shadow-sm border">
            <h2 className="text-xl font-semibold mb-4">API Provider Settings</h2>
            <p className="text-gray-600 mb-4">
              Configure which flight data API provider to use for search operations.
            </p>
            
            <Card className="p-4 mb-6">
              <ApiProviderSelector 
                apiProvider={apiProvider}
                onChange={handleProviderChange}
                disabled={isAppSettingsLoading}
                showFallbackOption={true}
                enableFallback={enableFallback}
                onFallbackChange={handleFallbackChange}
              />
            </Card>
            
            <div className="mt-4 p-4 bg-gray-50 rounded-md">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Notes:</h3>
              <ul className="text-xs text-gray-600 list-disc pl-5 space-y-1">
                <li>Amadeus API provides more modern and comprehensive flight data but may have different rate limits.</li>
                <li>Cirium API is the legacy provider with more historical data availability.</li>
                <li>API provider selection affects all flight searches performed across the application.</li>
                <li>The fallback option will try the alternate API if the primary one fails.</li>
              </ul>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Admin;
