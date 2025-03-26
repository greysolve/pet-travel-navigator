
import { PolicyField } from "./PolicyField";

interface SizeRestrictionsProps {
  sizeRestrictions: Record<string, any>;
}

export const SizeRestrictions = ({ sizeRestrictions }: SizeRestrictionsProps) => {
  if (!sizeRestrictions || Object.keys(sizeRestrictions).length === 0) {
    return null;
  }

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
