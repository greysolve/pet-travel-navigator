
import { ExternalLink } from "lucide-react";
import { JsonRenderer } from "@/components/ui/json-renderer";
import { PremiumFeature } from "@/components/ui/premium-feature";
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

      {/* Carrier Requirements - Premium Feature */}
      {policy.carrier_requirements && (
        <PremiumFeature title="Carrier requirements:">
          <JsonRenderer data={policy.carrier_requirements} />
        </PremiumFeature>
      )}

      {policy.carrier_requirements_cabin && (
        <PremiumFeature title="Cabin carrier requirements:">
          <JsonRenderer data={policy.carrier_requirements_cabin} />
        </PremiumFeature>
      )}

      {policy.carrier_requirements_cargo && (
        <PremiumFeature title="Cargo carrier requirements:">
          <JsonRenderer data={policy.carrier_requirements_cargo} />
        </PremiumFeature>
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

      {/* Temperature Restrictions - Premium Feature */}
      {policy.temperature_restrictions && (
        <PremiumFeature title="Temperature restrictions:">
          <JsonRenderer data={policy.temperature_restrictions} />
        </PremiumFeature>
      )}

      {policy.breed_restrictions?.length > 0 && (
        <div>
          <p className="font-medium mb-2">Breed restrictions:</p>
          <JsonRenderer data={policy.breed_restrictions} />
        </div>
      )}

      {/* Policy URL - Premium Feature */}
      {policy.policy_url && (
        <PremiumFeature title="Full policy:" className="inline-block">
          <a 
            href={policy.policy_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center text-primary hover:text-primary/80"
          >
            View full policy <ExternalLink className="h-4 w-4 ml-1" />
          </a>
        </PremiumFeature>
      )}
    </div>
  );
};

