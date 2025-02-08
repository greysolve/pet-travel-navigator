
import { ExternalLink } from "lucide-react";
import { JsonRenderer } from "@/components/ui/json-renderer";
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
    <div className="text-sm space-y-4 border-t pt-4">
      {policy.pet_types_allowed?.length > 0 && (
        <div>
          <p className="font-medium mb-2">Allowed pets:</p>
          <JsonRenderer data={policy.pet_types_allowed} />
        </div>
      )}

      {/* Size Restrictions */}
      {policy.size_restrictions && (
        <div>
          <p className="font-medium mb-2">Size and Weight Restrictions:</p>
          <JsonRenderer data={policy.size_restrictions} />
        </div>
      )}

      {/* Carrier Requirements */}
      {policy.carrier_requirements && (
        <div>
          <p className="font-medium mb-2">Carrier requirements:</p>
          <JsonRenderer data={policy.carrier_requirements} />
        </div>
      )}

      {policy.carrier_requirements_cabin && (
        <div>
          <p className="font-medium mb-2">Cabin carrier requirements:</p>
          <JsonRenderer data={policy.carrier_requirements_cabin} />
        </div>
      )}

      {policy.carrier_requirements_cargo && (
        <div>
          <p className="font-medium mb-2">Cargo carrier requirements:</p>
          <JsonRenderer data={policy.carrier_requirements_cargo} />
        </div>
      )}

      {/* Documentation */}
      {policy.documentation_needed?.length > 0 && (
        <div>
          <p className="font-medium mb-2">Required documentation:</p>
          <JsonRenderer data={policy.documentation_needed} />
        </div>
      )}

      {/* Fees */}
      {policy.fees && Object.keys(policy.fees).length > 0 && (
        <div>
          <p className="font-medium mb-2">Fees:</p>
          <JsonRenderer data={policy.fees} />
        </div>
      )}

      {/* Temperature and Breed Restrictions */}
      {policy.temperature_restrictions && (
        <div>
          <p className="font-medium mb-2">Temperature restrictions:</p>
          <JsonRenderer data={policy.temperature_restrictions} />
        </div>
      )}

      {policy.breed_restrictions?.length > 0 && (
        <div>
          <p className="font-medium mb-2">Breed restrictions:</p>
          <JsonRenderer data={policy.breed_restrictions} />
        </div>
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
