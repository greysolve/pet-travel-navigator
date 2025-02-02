import { ExternalLink } from "lucide-react";
import type { CountryPolicy } from "./types";

export const DestinationPolicy = ({ policy }: { policy?: CountryPolicy | null }) => {
  if (!policy) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-4">Destination Pet Policy</h2>
        <p className="text-gray-500 italic">No pet policy information available for this destination.</p>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">{policy.title}</h2>
        <a 
          href="https://www.aphis.usda.gov/aphis/pet-travel" 
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center text-primary hover:text-primary/80"
        >
          Official requirements <ExternalLink className="h-4 w-4 ml-1" />
        </a>
      </div>
      
      {policy.description && (
        <p className="text-gray-700 mb-4">{policy.description}</p>
      )}

      <div className="space-y-4">
        {policy.requirements?.length > 0 && (
          <div>
            <h3 className="font-medium mb-2">Requirements:</h3>
            <ul className="list-disc list-inside space-y-1">
              {policy.requirements.map((req, index) => (
                <li key={index} className="text-gray-700">{req}</li>
              ))}
            </ul>
          </div>
        )}

        {policy.documentation_needed?.length > 0 && (
          <div>
            <h3 className="font-medium mb-2">Required Documentation:</h3>
            <ul className="list-disc list-inside space-y-1">
              {policy.documentation_needed.map((doc, index) => (
                <li key={index} className="text-gray-700">{doc}</li>
              ))}
            </ul>
          </div>
        )}

        {policy.vaccination_requirements?.length > 0 && (
          <div>
            <h3 className="font-medium mb-2">Vaccination Requirements:</h3>
            <ul className="list-disc list-inside space-y-1">
              {policy.vaccination_requirements.map((vac, index) => (
                <li key={index} className="text-gray-700">{vac}</li>
              ))}
            </ul>
          </div>
        )}

        {policy.quarantine_requirements && (
          <div>
            <h3 className="font-medium mb-2">Quarantine Requirements:</h3>
            <p className="text-gray-700">{policy.quarantine_requirements}</p>
          </div>
        )}

        {policy.additional_notes && (
          <div className="mt-4 p-4 bg-gray-50 rounded-md">
            <p className="text-sm text-gray-600">{policy.additional_notes}</p>
          </div>
        )}
      </div>
    </div>
  );
};