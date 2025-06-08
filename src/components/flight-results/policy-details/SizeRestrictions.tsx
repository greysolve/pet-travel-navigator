
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
    const restrictions = sizeRestrictions as SizeRestrictionsType;
    
    return (
      <div>
        <p className="font-medium mb-2">Size and Weight Restrictions:</p>
        
        {/* Display pet type notes if available */}
        {restrictions.pet_type_notes && (
          <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-md">
            <p className="text-sm font-medium text-blue-800 mb-1">Pet Type Information:</p>
            <PolicyField value={restrictions.pet_type_notes} />
          </div>
        )}
        
        {Object.entries(restrictions).map(([key, value]) => {
          // Skip pet_type_notes since we display it separately above
          if (key === 'pet_type_notes') return null;
          
          return (
            <div key={key} className="mb-2">
              <p className="text-gray-600 capitalize mb-1">
                {key.split('_').join(' ')}:
              </p>
              <PolicyField value={value} />
            </div>
          );
        })}
      </div>
    );
  }

  return null;
};
