
import { ExternalLink } from "lucide-react";
import type { PetPolicy } from "./types";

type PolicyDetailsProps = {
  policy?: PetPolicy;
};

export const PolicyDetails = ({ policy }: PolicyDetailsProps) => {
  if (!policy) {
    return (
      <p className="text-sm text-gray-500 border-t pt-4">
        No specific pet policy information available for this airline. Please contact the airline directly.
      </p>
    );
  }

  return (
    <div className="text-sm space-y-2 border-t pt-4">
      {policy.pet_types_allowed?.length > 0 && (
        <p><span className="font-medium">Allowed pets:</span> {policy.pet_types_allowed.join(', ')}</p>
      )}
      {policy.carrier_requirements && (
        <p><span className="font-medium">Carrier requirements:</span> {policy.carrier_requirements}</p>
      )}
      {!policy.carrier_requirements && policy.carrier_requirements_cabin && (
        <p><span className="font-medium">Cabin carrier requirements:</span> {policy.carrier_requirements_cabin}</p>
      )}
      {!policy.carrier_requirements && policy.carrier_requirements_cargo && (
        <p><span className="font-medium">Cargo carrier requirements:</span> {policy.carrier_requirements_cargo}</p>
      )}
      {policy.documentation_needed?.length > 0 && (
        <p><span className="font-medium">Required documentation:</span> {policy.documentation_needed.join(', ')}</p>
      )}
      {policy.temperature_restrictions && (
        <p><span className="font-medium">Temperature restrictions:</span> {policy.temperature_restrictions}</p>
      )}
      {policy.breed_restrictions?.length > 0 && (
        <p><span className="font-medium">Breed restrictions:</span> {policy.breed_restrictions.join(', ')}</p>
      )}
      {policy.policy_url && (
        <a 
          href={policy.policy_url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center text-primary hover:text-primary/80 mt-2"
        >
          View full policy <ExternalLink className="h-4 w-4 ml-1" />
        </a>
      )}
    </div>
  );
};
