
import { PolicyField } from "./PolicyField";

interface SizeRestrictionsProps {
  sizeRestrictions: Record<string, any> | string;
}

export const SizeRestrictions = ({ sizeRestrictions }: SizeRestrictionsProps) => {
  if (!sizeRestrictions) {
    return null;
  }

  // Handle case when sizeRestrictions is a string
  if (typeof sizeRestrictions === 'string') {
    return (
      <div>
        <p className="font-medium mb-2">Size and Weight Restrictions:</p>
        <PolicyField value={sizeRestrictions} />
      </div>
    );
  }

  // Handle case when sizeRestrictions is an empty object
  if (typeof sizeRestrictions === 'object' && Object.keys(sizeRestrictions).length === 0) {
    return null;
  }

  // Handle case when sizeRestrictions is an object with key-value pairs
  return (
    <div>
      <p className="font-medium mb-2">Size and Weight Restrictions:</p>
      {Object.entries(sizeRestrictions).map(([key, value]) => (
        <div key={key} className="mb-2">
          <p className="text-gray-600 capitalize mb-1">
            {key.split('_').join(' ')}:
          </p>
          <PolicyField value={value} />
        </div>
      ))}
    </div>
  );
};
