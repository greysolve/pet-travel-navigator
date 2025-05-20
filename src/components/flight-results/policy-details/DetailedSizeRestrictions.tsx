
import { Badge } from "@/components/ui/badge";
import { isPremiumContent } from "../types";
import { PremiumField } from "./PremiumField";

interface DetailedSizeRestrictionsProps {
  // Cabin dimensions
  cabin_max_weight_kg?: number | null;
  cabin_combined_weight_kg?: number | null;
  cabin_length_cm?: number | null;
  cabin_width_cm?: number | null;
  cabin_height_cm?: number | null;
  cabin_linear_dimensions_cm?: number | null;
  
  // Cargo dimensions
  cargo_max_weight_kg?: number | null;
  cargo_combined_weight_kg?: number | null;
  cargo_length_cm?: number | null;
  cargo_width_cm?: number | null;
  cargo_height_cm?: number | null;
  cargo_linear_dimensions_cm?: number | null;
  
  // Additional info
  weight_includes_carrier?: boolean | null;
}

export const DetailedSizeRestrictions = ({
  cabin_max_weight_kg,
  cabin_combined_weight_kg,
  cabin_length_cm,
  cabin_width_cm,
  cabin_height_cm,
  cabin_linear_dimensions_cm,
  cargo_max_weight_kg,
  cargo_combined_weight_kg,
  cargo_length_cm,
  cargo_width_cm,
  cargo_height_cm,
  cargo_linear_dimensions_cm,
  weight_includes_carrier
}: DetailedSizeRestrictionsProps) => {
  
  const hasCabinRestrictions = cabin_max_weight_kg || cabin_combined_weight_kg || 
    cabin_length_cm || cabin_width_cm || cabin_height_cm || cabin_linear_dimensions_cm;
  
  const hasCargoRestrictions = cargo_max_weight_kg || cargo_combined_weight_kg ||
    cargo_length_cm || cargo_width_cm || cargo_height_cm || cargo_linear_dimensions_cm;
  
  if (!hasCabinRestrictions && !hasCargoRestrictions) {
    return null;
  }

  return (
    <div>
      <p className="font-medium mb-2">Size and Weight Restrictions:</p>
      
      {/* Cabin restrictions */}
      {hasCabinRestrictions && (
        <div className="mb-4">
          <div className="flex items-center mb-1">
            <Badge variant="outline" className="mr-2">Cabin</Badge>
            <p className="text-sm font-medium text-gray-700">In-Cabin Restrictions</p>
          </div>
          
          <div className="ml-4 space-y-2">
            {cabin_max_weight_kg && (
              <div className="text-sm">
                <span className="text-gray-600">Maximum Weight: </span>
                <span>{cabin_max_weight_kg} kg</span>
              </div>
            )}
            
            {cabin_combined_weight_kg && (
              <div className="text-sm">
                <span className="text-gray-600">Combined Weight (pet + carrier): </span>
                <span>{cabin_combined_weight_kg} kg</span>
              </div>
            )}
            
            {(cabin_length_cm || cabin_width_cm || cabin_height_cm) && (
              <div className="text-sm">
                <span className="text-gray-600">Carrier Dimensions: </span>
                <span>
                  {cabin_length_cm && `${cabin_length_cm} cm (L)`}
                  {cabin_width_cm && cabin_length_cm && ' x '}
                  {cabin_width_cm && `${cabin_width_cm} cm (W)`}
                  {cabin_height_cm && (cabin_length_cm || cabin_width_cm) && ' x '}
                  {cabin_height_cm && `${cabin_height_cm} cm (H)`}
                </span>
              </div>
            )}
            
            {cabin_linear_dimensions_cm && (
              <div className="text-sm">
                <span className="text-gray-600">Maximum Linear Dimensions: </span>
                <span>{cabin_linear_dimensions_cm} cm</span>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Cargo restrictions */}
      {hasCargoRestrictions && (
        <div className="mb-4">
          <div className="flex items-center mb-1">
            <Badge variant="outline" className="mr-2">Cargo</Badge>
            <p className="text-sm font-medium text-gray-700">Cargo Hold Restrictions</p>
          </div>
          
          <div className="ml-4 space-y-2">
            {cargo_max_weight_kg && (
              <div className="text-sm">
                <span className="text-gray-600">Maximum Weight: </span>
                <span>{cargo_max_weight_kg} kg</span>
              </div>
            )}
            
            {cargo_combined_weight_kg && (
              <div className="text-sm">
                <span className="text-gray-600">Combined Weight (pet + carrier): </span>
                <span>{cargo_combined_weight_kg} kg</span>
              </div>
            )}
            
            {(cargo_length_cm || cargo_width_cm || cargo_height_cm) && (
              <div className="text-sm">
                <span className="text-gray-600">Carrier Dimensions: </span>
                <span>
                  {cargo_length_cm && `${cargo_length_cm} cm (L)`}
                  {cargo_width_cm && cargo_length_cm && ' x '}
                  {cargo_width_cm && `${cargo_width_cm} cm (W)`}
                  {cargo_height_cm && (cargo_length_cm || cargo_width_cm) && ' x '}
                  {cargo_height_cm && `${cargo_height_cm} cm (H)`}
                </span>
              </div>
            )}
            
            {cargo_linear_dimensions_cm && (
              <div className="text-sm">
                <span className="text-gray-600">Maximum Linear Dimensions: </span>
                <span>{cargo_linear_dimensions_cm} cm</span>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Additional info */}
      {weight_includes_carrier !== null && weight_includes_carrier !== undefined && (
        <div className="text-sm text-gray-600 italic">
          {weight_includes_carrier 
            ? "Note: Weight limits include the carrier/container." 
            : "Note: Weight limits are for the pet only, excluding carrier/container."}
        </div>
      )}
    </div>
  );
};
