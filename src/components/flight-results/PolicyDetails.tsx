
import { ExternalLink } from "lucide-react";
import { JsonRenderer } from "@/components/ui/json-renderer";
import { PremiumFeature } from "@/components/ui/premium-feature";
import type { PetPolicy } from "./types";
import { useMemo } from "react";

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
      <div className="blur-sm select-none">
        <JsonRenderer data={value.value} />
      </div>
    </PremiumFeature>
  );
};

const renderValue = (value: any) => {
  if (Array.isArray(value)) {
    return value.length > 0 ? (
      <ul className="list-disc list-inside">
        {value.map((item, index) => (
          <li key={index} className="text-gray-600">{item}</li>
        ))}
      </ul>
    ) : (
      <p className="text-gray-500 italic">None specified</p>
    );
  }
  
  if (typeof value === 'string') {
    return <p className="text-gray-600">{value}</p>;
  }
  
  return <JsonRenderer data={value} />;
};

const renderPolicyField = (value: any, label?: string) => {
  if (isPremiumField(value)) {
    return renderPremiumField(value, label);
  }
  return renderValue(value);
};

// Utility function to create a content hash for policy comparison
const generateContentSignature = (policy: PetPolicy): string => {
  // Get relevant fields for comparison
  const relevantFields = {
    pet_types_allowed: policy.pet_types_allowed,
    size_restrictions: policy.size_restrictions,
    documentation_needed: policy.documentation_needed,
    fees: policy.fees,
    breed_restrictions: policy.breed_restrictions,
    carrier_requirements: policy.carrier_requirements,
    carrier_requirements_cabin: policy.carrier_requirements_cabin,
    carrier_requirements_cargo: policy.carrier_requirements_cargo,
    temperature_restrictions: policy.temperature_restrictions
  };
  
  // Create a stable string representation
  return JSON.stringify(relevantFields, Object.keys(relevantFields).sort());
};

export const PolicyDetails = ({ policy }: PolicyDetailsProps) => {
  console.log('Rendering policy:', policy);

  // Calculate content signature for display in admin console or debugging
  const contentSignature = useMemo(() => {
    if (!policy) return null;
    return generateContentSignature(policy);
  }, [policy]);

  // Store content signature as a data attribute for admin tools
  const dataAttributes = policy ? {
    'data-content-signature': btoa(contentSignature || '')
  } : {};

  if (!policy) {
    return (
      <p className="text-sm text-gray-500 border-t pt-4">
        No specific pet policy information available for this airline. Please contact the airline directly.
      </p>
    );
  }

  return (
    <div className="text-sm space-y-4 border-t pt-4" {...dataAttributes}>
      {/* Pet Types */}
      {policy.pet_types_allowed && (
        <div>
          <p className="font-medium mb-2">Allowed pets:</p>
          {renderValue(policy.pet_types_allowed)}
        </div>
      )}

      {/* Size Restrictions */}
      {policy.size_restrictions && (
        <div>
          <p className="font-medium mb-2">Size and Weight Restrictions:</p>
          {Object.entries(policy.size_restrictions).map(([key, value]) => (
            <div key={key} className="mb-2">
              <p className="text-gray-600 capitalize mb-1">
                {key.split('_').join(' ')}:
              </p>
              {renderPolicyField(value)}
            </div>
          ))}
        </div>
      )}

      {/* Fees */}
      {policy.fees && Object.keys(policy.fees).length > 0 && (
        <div>
          <p className="font-medium mb-2">Fees:</p>
          {Object.entries(policy.fees).map(([key, value]) => (
            <div key={key} className="mb-2">
              <p className="text-gray-600 capitalize mb-1">
                {key.split('_').join(' ')}:
              </p>
              {renderPolicyField(value)}
            </div>
          ))}
        </div>
      )}

      {/* Documentation */}
      {policy.documentation_needed && (
        <div>
          <p className="font-medium mb-2">Required Documentation:</p>
          {renderValue(policy.documentation_needed)}
        </div>
      )}

      {/* Breed Restrictions */}
      {policy.breed_restrictions && (
        <div>
          <p className="font-medium mb-2">Breed Restrictions:</p>
          {renderValue(policy.breed_restrictions)}
        </div>
      )}

      {/* Carrier Requirements */}
      {(policy.carrier_requirements || policy.carrier_requirements_cabin || policy.carrier_requirements_cargo) && (
        <div>
          <p className="font-medium mb-2">Carrier Requirements:</p>
          {policy.carrier_requirements && (
            <div className="mb-2">
              {renderPolicyField(policy.carrier_requirements, "General Requirements")}
            </div>
          )}
          {policy.carrier_requirements_cabin && (
            <div className="mb-2">
              <p className="text-gray-600 mb-1">For Cabin:</p>
              {renderPolicyField(policy.carrier_requirements_cabin)}
            </div>
          )}
          {policy.carrier_requirements_cargo && (
            <div>
              <p className="text-gray-600 mb-1">For Cargo:</p>
              {renderPolicyField(policy.carrier_requirements_cargo)}
            </div>
          )}
        </div>
      )}

      {/* Temperature Restrictions */}
      {policy.temperature_restrictions && (
        <div>
          <p className="font-medium mb-2">Temperature Restrictions:</p>
          {renderPolicyField(policy.temperature_restrictions)}
        </div>
      )}

      {/* Policy URL */}
      {policy.policy_url && (
        <div>
          {isPremiumField(policy.policy_url) ? (
            <PremiumFeature title="Full Policy">
              <div className="blur-sm select-none">
                <span className="inline-flex items-center text-primary">
                  View full policy <ExternalLink className="h-4 w-4 ml-1" />
                </span>
              </div>
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
