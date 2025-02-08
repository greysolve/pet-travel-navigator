
import { ExternalLink } from "lucide-react";
import type { PetPolicy } from "./types";

type PolicyDetailsProps = {
  policy?: PetPolicy;
};

export const PolicyDetails = ({ policy }: PolicyDetailsProps) => {
  // Helper function to handle potentially nested object values
  const formatValue = (value: unknown): string => {
    if (typeof value === 'object' && value !== null) {
      return Object.entries(value)
        .map(([key, val]) => `${key}: ${val}`)
        .join(', ');
    }
    return String(value);
  };

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

      {/* Size Restrictions */}
      {policy.size_restrictions && (
        <div className="space-y-1">
          <p className="font-medium">Size and Weight Restrictions:</p>
          {policy.size_restrictions.max_weight_cabin && (
            <p className="ml-4">• Maximum cabin weight: {formatValue(policy.size_restrictions.max_weight_cabin)}</p>
          )}
          {policy.size_restrictions.max_weight_cargo && (
            <p className="ml-4">• Maximum cargo weight: {formatValue(policy.size_restrictions.max_weight_cargo)}</p>
          )}
          {policy.size_restrictions.carrier_dimensions_cabin && (
            <p className="ml-4">• Carrier dimensions: {formatValue(policy.size_restrictions.carrier_dimensions_cabin)}</p>
          )}
        </div>
      )}

      {/* Carrier Requirements */}
      {policy.carrier_requirements && (
        <p><span className="font-medium">Carrier requirements:</span> {formatValue(policy.carrier_requirements)}</p>
      )}
      {policy.carrier_requirements_cabin && (
        <p><span className="font-medium">Cabin carrier requirements:</span> {formatValue(policy.carrier_requirements_cabin)}</p>
      )}
      {policy.carrier_requirements_cargo && (
        <p><span className="font-medium">Cargo carrier requirements:</span> {formatValue(policy.carrier_requirements_cargo)}</p>
      )}

      {/* Documentation */}
      {policy.documentation_needed?.length > 0 && (
        <p><span className="font-medium">Required documentation:</span> {policy.documentation_needed.join(', ')}</p>
      )}

      {/* Fees */}
      {policy.fees && (Object.keys(policy.fees).length > 0) && (
        <div className="space-y-1">
          <p className="font-medium">Fees:</p>
          {policy.fees.in_cabin && (
            <p className="ml-4">• Cabin: {formatValue(policy.fees.in_cabin)}</p>
          )}
          {policy.fees.cargo && (
            <p className="ml-4">• Cargo: {formatValue(policy.fees.cargo)}</p>
          )}
        </div>
      )}

      {/* Temperature and Breed Restrictions */}
      {policy.temperature_restrictions && (
        <p><span className="font-medium">Temperature restrictions:</span> {formatValue(policy.temperature_restrictions)}</p>
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
