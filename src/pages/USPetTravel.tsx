
import { ExternalLink } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const USPetTravel = () => {
  return (
    <div className="min-h-screen bg-[#F1F0FB] py-8">
      <div className="container mx-auto px-4">
        <h1 className="text-3xl font-bold mb-8 text-center">US Pet Travel Resources</h1>
        
        <div className="max-w-3xl mx-auto mb-8">
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>USDA APHIS Pet Travel Information</CardTitle>
              <CardDescription>Official US government resource for pet travel requirements</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="mb-4">The USDA's Animal and Plant Health Inspection Service (APHIS) provides comprehensive information about traveling with pets to and from the United States.</p>
              <p className="mb-4"><strong>When to use:</strong> This should be your primary resource for all US-related pet travel requirements, health certificates, and regulations.</p>
              <a 
                href="https://www.aphis.usda.gov/aphis/pet-travel" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center text-primary hover:underline"
              >
                Visit USDA APHIS Pet Travel <ExternalLink className="ml-2 h-4 w-4" />
              </a>
            </CardContent>
          </Card>

          <Card className="mb-6">
            <CardHeader>
              <CardTitle>CDC - Bringing Animals into the US</CardTitle>
              <CardDescription>Health and safety requirements for pet import</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="mb-4">The Centers for Disease Control and Prevention (CDC) provides information about health requirements for bringing pets and other animals into the United States.</p>
              <p className="mb-4"><strong>When to use:</strong> For specific information about rabies vaccination requirements, quarantine policies, and other health-related concerns when bringing pets to the US.</p>
              <a 
                href="https://www.cdc.gov/importation/bringing-an-animal-into-the-united-states/index.html" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center text-primary hover:underline"
              >
                Visit CDC Pet Importation <ExternalLink className="ml-2 h-4 w-4" />
              </a>
            </CardContent>
          </Card>

          <Card className="mb-6">
            <CardHeader>
              <CardTitle>U.S. Customs and Border Protection</CardTitle>
              <CardDescription>Entry requirements and procedures</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="mb-4">The U.S. Customs and Border Protection provides information about the entry process when traveling with pets to the United States.</p>
              <p className="mb-4"><strong>When to use:</strong> For information about customs procedures, declaration requirements, and what to expect when arriving at U.S. ports of entry with your pet.</p>
              <a 
                href="https://www.cbp.gov/travel/international-visitors/agricultural-items" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center text-primary hover:underline"
              >
                Visit U.S. Customs and Border Protection <ExternalLink className="ml-2 h-4 w-4" />
              </a>
            </CardContent>
          </Card>
        </div>

        <div className="max-w-3xl mx-auto text-center">
          <p className="text-sm text-gray-500">
            Disclaimer: These resources link to external websites. We provide these links for informational purposes only. Always check with the relevant authorities for the most up-to-date information.
          </p>
        </div>
      </div>
    </div>
  );
};

export default USPetTravel;
