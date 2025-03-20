
import { PetPolicyUpdate } from './PetPolicyUpdate';
import { PetPolicyAnalyzer } from './PetPolicyAnalyzer';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const PetPolicyAdmin = () => {
  return (
    <Tabs defaultValue="update" className="w-full">
      <TabsList className="mb-4">
        <TabsTrigger value="update">Update Policies</TabsTrigger>
        <TabsTrigger value="analyze">Analyze Single Airline</TabsTrigger>
      </TabsList>
      
      <TabsContent value="update">
        <PetPolicyUpdate />
      </TabsContent>
      
      <TabsContent value="analyze">
        <PetPolicyAnalyzer />
      </TabsContent>
    </Tabs>
  );
};
