
import { PolicyField } from "./PolicyField";
import { SizeRestrictionsField, SizeRestrictions as SizeRestrictionsType, isPremiumContent } from "../types";
import { isObject } from "@/utils/typeGuards";

interface SizeRestrictionsProps {
  sizeRestrictions: SizeRestrictionsField;
}

export const SizeRestrictions = ({ sizeRestrictions }: SizeRestrictionsProps) => {
  if (!sizeRestrictions) {
    return null;
  }

  // Handle premium content wrapper
  if (isPremiumContent(sizeRestrictions)) {
    return (
      <div>
        <p className="font-medium mb-2">Size and Weight Restrictions:</p>
        <PolicyField value={sizeRestrictions} />
      </div>
    );
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

  // Handle case when sizeRestrictions is an object with key-value pairs
  if (isObject(sizeRestrictions) && Object.keys(sizeRestrictions).length > 0) {
    return (
      <div>
        <p className="font-medium mb-2">Size and Weight Restrictions:</p>
        {Object.entries(sizeRestrictions as SizeRestrictionsType).map(([key, value]) => (
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
