
import { PolicyField } from "./PolicyField";
import { FeesField, Fees, isPremiumContent } from "../types";
import { isObject } from "@/utils/typeGuards";

interface FeeDetailsProps {
  fees: FeesField;
}

// Helper to safely check if a value is an object
const isObject = (value: any): value is Record<string, any> => {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
};

export const FeeDetails = ({ fees }: FeeDetailsProps) => {
  if (!fees) {
    return null;
  }

  // Handle premium content wrapper
  if (isPremiumContent(fees)) {
    return (
      <div>
        <p className="font-medium mb-2">Fees:</p>
        <PolicyField value={fees} />
      </div>
    );
  }

  // Handle string value
  if (typeof fees === 'string') {
    return (
      <div>
        <p className="font-medium mb-2">Fees:</p>
        <PolicyField value={fees} />
      </div>
    );
  }

  // Handle object with key-value pairs
  if (isObject(fees) && Object.keys(fees).length > 0) {
    return (
      <div>
        <p className="font-medium mb-2">Fees:</p>
        {Object.entries(fees as Fees).map(([key, value]) => (
          <div key={key} className="mb-2">
            <p className="text-gray-600 capitalize mb-1">
              {key.split('_').join(' ')}:
            </p>
            <PolicyField value={value} />
          </div>
        ))}
      </div>
    );
  }

  return null;
};
