
import { useMemo } from "react";
import type { PetPolicy } from "./types";
import { PolicySection } from "./policy-details/PolicySection";
import { DetailedSizeRestrictions } from "./policy-details/DetailedSizeRestrictions";
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

      {/* Size Restrictions - using the new DetailedSizeRestrictions component */}
      <DetailedSizeRestrictions 
        cabin_max_weight_kg={policy.cabin_max_weight_kg}
        cabin_combined_weight_kg={policy.cabin_combined_weight_kg}
        cabin_length_cm={policy.cabin_length_cm}
        cabin_width_cm={policy.cabin_width_cm}
        cabin_height_cm={policy.cabin_height_cm}
        cabin_linear_dimensions_cm={policy.cabin_linear_dimensions_cm}
        cargo_max_weight_kg={policy.cargo_max_weight_kg}
        cargo_combined_weight_kg={policy.cargo_combined_weight_kg}
        cargo_length_cm={policy.cargo_length_cm}
        cargo_width_cm={policy.cargo_width_cm}
        cargo_height_cm={policy.cargo_height_cm}
        cargo_linear_dimensions_cm={policy.cargo_linear_dimensions_cm}
        weight_includes_carrier={policy.weight_includes_carrier}
      />

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
