
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
  if (value && typeof value === 'object' && 'isPremiumField' in value) {
    console.log('[PolicyDetails] Detected premium field:', value);
    return true;
  }
  return false;
};

const renderValue = (value: any, label?: string): JSX.Element => {
  console.log('[PolicyDetails] Rendering value:', { value, label });
  
  if (value === null || value === undefined) {
    return <p className="text-gray-500 italic">(None specified)</p>;
  }
  
  if (isPremiumField(value)) {
    console.log('[PolicyDetails] Rendering premium field:', { value, label });
    return (
      <PremiumFeature title={label || ""}>
        <div className="blur-sm select-none">
          <JsonRenderer data={value.value} />
        </div>
      </PremiumFeature>
    );
  }

  if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
    return (
      <div className="space-y-2">
        {Object.entries(value).map(([key, val]) => (
          <div key={key} className="ml-4">
            <p className="text-gray-600 text-sm">{key}:</p>
            {renderValue(val, `${label} - ${key}`)}
          </div>
        ))}
      </div>
    );
  }

  if (Array.isArray(value) && value.length === 0) {
    return <p className="text-gray-500 italic">(None specified)</p>;
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

  const renderSection = (
    key: keyof PetPolicy,
    label: string,
    value: any
  ) => {
    if (value === null || value === undefined) return null;
    
    return (
      <div>
        <p className="font-medium mb-2">{label}:</p>
        {renderValue(value, label)}
      </div>
    );
  };

  return (
    <div className="text-sm space-y-4 border-t pt-4">
      {renderSection('pet_types_allowed', 'Allowed pets', policy.pet_types_allowed)}
      {renderSection('size_restrictions', 'Size and Weight Restrictions', policy.size_restrictions)}
      {renderSection('fees', 'Fees', policy.fees)}
      {renderSection('documentation_needed', 'Required Documentation', policy.documentation_needed)}
      {renderSection('breed_restrictions', 'Breed Restrictions', policy.breed_restrictions)}
      {renderSection('carrier_requirements', 'General Carrier Requirements', policy.carrier_requirements)}
      {renderSection('carrier_requirements_cabin', 'Cabin Carrier Requirements', policy.carrier_requirements_cabin)}
      {renderSection('carrier_requirements_cargo', 'Cargo Carrier Requirements', policy.carrier_requirements_cargo)}
      {renderSection('temperature_restrictions', 'Temperature Restrictions', policy.temperature_restrictions)}

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
