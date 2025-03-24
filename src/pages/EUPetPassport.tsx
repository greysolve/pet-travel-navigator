
import { ExternalLink } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const EUPetPassport = () => {
  return (
    <div className="min-h-screen bg-[#F1F0FB] py-8">
      <div className="container mx-auto px-4">
        <h1 className="text-3xl font-bold mb-8 text-center">EU Pet Passport Resources</h1>
        
        <div className="max-w-3xl mx-auto mb-8">
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>European Commission - EU Pet Travel</CardTitle>
              <CardDescription>Official information on the EU Pet Passport system</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="mb-4">The European Commission provides comprehensive information about the EU Pet Passport system and requirements for traveling with pets within EU member states.</p>
              <p className="mb-4"><strong>When to use:</strong> This should be your primary resource for understanding the EU Pet Passport requirements, eligible countries, and travel regulations within the European Union.</p>
              <a 
                href="https://food.ec.europa.eu/animals/movement-pets_en" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center text-primary hover:underline"
              >
                Visit European Commission Pet Travel <ExternalLink className="ml-2 h-4 w-4" />
              </a>
            </CardContent>
          </Card>

          <Card className="mb-6">
            <CardHeader>
              <CardTitle>UK Government - Pet Travel to Europe</CardTitle>
              <CardDescription>Information for UK pet owners traveling to the EU</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="mb-4">The UK Government provides specific guidance for UK pet owners traveling with their pets to EU countries and Northern Ireland after Brexit.</p>
              <p className="mb-4"><strong>When to use:</strong> For UK pet owners who need to understand the current requirements for traveling with pets to EU countries, including the changes after Brexit.</p>
              <a 
                href="https://www.gov.uk/taking-your-pet-abroad" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center text-primary hover:underline"
              >
                Visit UK Government Pet Travel Guide <ExternalLink className="ml-2 h-4 w-4" />
              </a>
            </CardContent>
          </Card>

          <Card className="mb-6">
            <CardHeader>
              <CardTitle>IATA - Live Animals Regulations</CardTitle>
              <CardDescription>Air transport regulations for pets</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="mb-4">The International Air Transport Association (IATA) provides information about the requirements for transporting pets by air, including container specifications and airline procedures.</p>
              <p className="mb-4"><strong>When to use:</strong> When planning air travel with your pet to or within Europe, to understand carrier requirements and animal welfare standards.</p>
              <a 
                href="https://www.iata.org/en/programs/cargo/live-animals/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center text-primary hover:underline"
              >
                Visit IATA Live Animals Regulations <ExternalLink className="ml-2 h-4 w-4" />
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

export default EUPetPassport;
