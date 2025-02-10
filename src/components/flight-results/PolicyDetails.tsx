
import { ExternalLink } from "lucide-react";
import { JsonRenderer } from "@/components/ui/json-renderer";
import { PremiumFeature } from "@/components/ui/premium-feature";
import type { PetPolicy } from "./types";

type PolicyDetailsProps = {
  policy?: PetPolicy;
};

type PremiumFieldValue = {
  value: any;
  isPremiumField: true;
};

const isPremiumField = (value: any): value is PremiumFieldValue => {
  return value && typeof value === 'object' && 'isPremiumField' in value;
};

const renderPremiumField = (value: PremiumFieldValue, label?: string) => {
  return (
    <PremiumFeature title={label || ""}>
      <JsonRenderer data={value.value} />
    </PremiumFeature>
  );
};

const renderPolicyField = (value: any, label?: string) => {
  if (isPremiumField(value)) {
    return renderPremiumField(value, label);
  }
  return <JsonRenderer data={value} />;
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
      {/* Pet Types */}
      {policy.pet_types_allowed?.length > 0 && (
        <div>
          <p className="font-medium mb-2">Allowed pets:</p>
          {renderPolicyField(policy.pet_types_allowed, "Allowed pets")}
        </div>
      )}

      {/* Size Restrictions */}
      {policy.size_restrictions && (
        <div>
          <p className="font-medium mb-2">Size and Weight Restrictions:</p>
          {renderPolicyField(policy.size_restrictions, "Size and Weight Restrictions")}
        </div>
      )}

      {/* Fees */}
      {policy.fees && Object.keys(policy.fees).length > 0 && (
        <div>
          <p className="font-medium mb-2">Fees:</p>
          {renderPolicyField(policy.fees, "Fees")}
        </div>
      )}

      {/* Documentation */}
      {policy.documentation_needed?.length > 0 && (
        <div>
          <p className="font-medium mb-2">Required Documentation:</p>
          {renderPolicyField(policy.documentation_needed, "Required Documentation")}
        </div>
      )}

      {/* Breed Restrictions */}
      {policy.breed_restrictions?.length > 0 && (
        <div>
          <p className="font-medium mb-2">Breed Restrictions:</p>
          {renderPolicyField(policy.breed_restrictions, "Breed Restrictions")}
        </div>
      )}

      {/* Combined Carrier Requirements Section */}
      {(policy.carrier_requirements || policy.carrier_requirements_cabin || policy.carrier_requirements_cargo) && (
        <div>
          <p className="font-medium mb-2">Carrier Requirements:</p>
          {policy.carrier_requirements && (
            <div className="mb-2">
              {renderPolicyField(policy.carrier_requirements, "General Carrier Requirements")}
            </div>
          )}
          {policy.carrier_requirements_cabin && (
            <div className="mb-2">
              <p className="text-gray-600 mb-1">For Cabin:</p>
              {renderPolicyField(policy.carrier_requirements_cabin, "Cabin Carrier Requirements")}
            </div>
          )}
          {policy.carrier_requirements_cargo && (
            <div>
              <p className="text-gray-600 mb-1">For Cargo:</p>
              {renderPolicyField(policy.carrier_requirements_cargo, "Cargo Carrier Requirements")}
            </div>
          )}
        </div>
      )}

      {/* Temperature Restrictions */}
      {policy.temperature_restrictions && (
        <div>
          <p className="font-medium mb-2">Temperature Restrictions:</p>
          {renderPolicyField(policy.temperature_restrictions, "Temperature Restrictions")}
        </div>
      )}

      {/* Policy URL */}
      {policy.policy_url && (
        <div>
          {isPremiumField(policy.policy_url) ? (
            <PremiumFeature title="Full Policy:" className="inline-block">
              <a 
                href={policy.policy_url.value}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center text-primary hover:text-primary/80"
              >
                View full policy <ExternalLink className="h-4 w-4 ml-1" />
              </a>
            </PremiumFeature>
          ) : (
            <a 
              href={policy.policy_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center text-primary hover:text-primary/80"
            >
              View full policy <ExternalLink className="h-4 w-4 ml-1" />
            </a>
          )}
        </div>
      )}
    </div>
  );
};
