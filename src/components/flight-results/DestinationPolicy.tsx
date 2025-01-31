import { ExternalLink } from "lucide-react";

export const DestinationPolicy = () => {
  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Destination Pet Policy</h2>
        <a 
          href="https://www.aphis.usda.gov/aphis/pet-travel" 
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center text-primary hover:text-primary/80"
        >
          Official requirements <ExternalLink className="h-4 w-4 ml-1" />
        </a>
      </div>
      <p className="text-gray-700">
        Pets entering this destination must have:
        <ul className="list-disc list-inside mt-2 space-y-2">
          <li>Valid pet passport</li>
          <li>Up-to-date vaccinations</li>
          <li>Microchip identification</li>
          <li>Health certificate issued within 10 days of travel</li>
        </ul>
      </p>
    </div>
  );
};