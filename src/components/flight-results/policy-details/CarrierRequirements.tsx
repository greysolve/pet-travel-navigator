
import { PolicyField } from "./PolicyField";

interface CarrierRequirementsProps {
  policy: {
    carrier_requirements?: any;
    carrier_requirements_cabin?: any;
    carrier_requirements_cargo?: any;
  };
}

export const CarrierRequirements = ({ policy }: CarrierRequirementsProps) => {
  if (!policy.carrier_requirements && 
      !policy.carrier_requirements_cabin && 
      !policy.carrier_requirements_cargo) {
    return null;
  }

  return (
    <div>
      <p className="font-medium mb-2">Carrier Requirements:</p>
      {policy.carrier_requirements && (
        <div className="mb-2">
          <PolicyField 
            value={policy.carrier_requirements} 
            label="General Requirements" 
          />
        </div>
      )}
      {policy.carrier_requirements_cabin && (
        <div className="mb-2">
          <p className="text-gray-600 mb-1">For Cabin:</p>
          <PolicyField value={policy.carrier_requirements_cabin} />
        </div>
      )}
      {policy.carrier_requirements_cargo && (
        <div>
          <p className="text-gray-600 mb-1">For Cargo:</p>
          <PolicyField value={policy.carrier_requirements_cargo} />
        </div>
      )}
    </div>
  );
};
