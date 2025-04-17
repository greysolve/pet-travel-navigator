
import { useMemo } from "react";
import type { PetPolicy } from "./types";
import { PolicySection } from "./policy-details/PolicySection";
import { SizeRestrictions } from "./policy-details/SizeRestrictions";
import { FeeDetails } from "./policy-details/FeeDetails";
import { CarrierRequirements } from "./policy-details/CarrierRequirements";
import { PolicyUrl } from "./policy-details/PolicyUrl";
import { useContentSignature } from "./policy-details/ContentSignatureGenerator";

type PolicyDetailsProps = {
  policy?: PetPolicy;
};

export const PolicyDetails = ({ policy }: PolicyDetailsProps) => {
  console.log('Rendering policy:', policy);

  const dataAttributes = useContentSignature(policy);

  if (!policy) {
    return (
      <p className="text-sm text-gray-500 border-t pt-4">
        No specific pet policy information available for this airline. Please contact the airline directly.
      </p>
    );
  }

  return (
    <div className="text-sm space-y-5" {...dataAttributes}>
      {/* Pet Types */}
      <PolicySection 
        title="Allowed pets" 
        data={policy.pet_types_allowed} 
      />

      {/* Size Restrictions */}
      <SizeRestrictions sizeRestrictions={policy.size_restrictions || {}} />

      {/* Fees */}
      <FeeDetails fees={policy.fees || {}} />

      {/* Documentation */}
      <PolicySection 
        title="Required Documentation" 
        data={policy.documentation_needed} 
      />

      {/* Breed Restrictions */}
      <PolicySection 
        title="Breed Restrictions" 
        data={policy.breed_restrictions} 
      />

      {/* Carrier Requirements */}
      <CarrierRequirements policy={policy} />

      {/* Temperature Restrictions */}
      <PolicySection 
        title="Temperature Restrictions" 
        data={policy.temperature_restrictions} 
      />

      {/* Policy URL */}
      <PolicyUrl policyUrl={policy.policy_url} />
    </div>
  );
};
