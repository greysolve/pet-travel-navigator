
import { ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { CountryPolicy, PolicyType } from "./types";

const getPolicyTypeLabel = (type: PolicyType) => {
  return type === 'pet_arrival' ? 'Arrival Policy' : 'Transit Policy';
};

const getPolicyTypeBadgeColor = (type: PolicyType) => {
  return type === 'pet_arrival' ? 'bg-primary' : 'bg-secondary';
};

export const DestinationPolicy = ({ policy }: { policy?: CountryPolicy | null }) => {
  if (!policy) {
    return (
      <div className="bg-white p-6 rounded-lg">
        <h2 className="text-xl font-semibold mb-4">Destination Pet Policy</h2>
        <p className="text-gray-500 italic">No pet policy information available for this destination.</p>
      </div>
    );
  }

  return (
    <div className="bg-white p-8 rounded-lg">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-semibold tracking-normal">{policy.title}</h2>
          <Badge className={`${getPolicyTypeBadgeColor(policy.policy_type)}`}>
            {getPolicyTypeLabel(policy.policy_type)}
          </Badge>
        </div>
        {policy.policy_url && (
          <a 
            href={policy.policy_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center text-primary hover:text-primary/80"
          >
            Official requirements <ExternalLink className="h-4 w-4 ml-1" />
          </a>
        )}
      </div>
      
      {policy.description && (
        <p className="text-gray-700 mb-6 text-lg">{policy.description}</p>
      )}

      <div className="space-y-6">
        {policy.vaccination_requirements?.length > 0 && (
          <div>
            <h3 className="text-xl font-semibold mb-3 tracking-normal">Vaccination Requirements:</h3>
            <ul className="list-disc list-inside space-y-2">
              {policy.vaccination_requirements.map((vac, index) => (
                <li key={index} className="text-gray-700 text-lg">{vac}</li>
              ))}
            </ul>
          </div>
        )}

        {policy.requirements?.length > 0 && (
          <div>
            <h3 className="text-xl font-semibold mb-3 tracking-normal">Requirements:</h3>
            <ul className="list-disc list-inside space-y-2">
              {policy.requirements.map((req, index) => (
                <li key={index} className="text-gray-700 text-lg">{req}</li>
              ))}
            </ul>
          </div>
        )}

        {policy.documentation_needed?.length > 0 && (
          <div>
            <h3 className="text-xl font-semibold mb-3 tracking-normal">Required Documentation:</h3>
            <ul className="list-disc list-inside space-y-2">
              {policy.documentation_needed.map((doc, index) => (
                <li key={index} className="text-gray-700 text-lg">{doc}</li>
              ))}
            </ul>
          </div>
        )}

        {policy.quarantine_requirements && (
          <div>
            <h3 className="text-xl font-semibold mb-3 tracking-normal">Quarantine Requirements:</h3>
            <p className="text-gray-700 text-lg">{policy.quarantine_requirements}</p>
          </div>
        )}

        {policy.additional_notes && typeof policy.additional_notes === 'string' && !policy.additional_notes.startsWith('{') && (
          <div className="mt-6 p-4 bg-gray-50 rounded-md">
            <p className="text-gray-600 text-lg">{policy.additional_notes}</p>
          </div>
        )}
      </div>
    </div>
  );
};
