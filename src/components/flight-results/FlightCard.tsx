import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PawPrint, ExternalLink } from "lucide-react";
import { type PetPolicy } from "./types";

type FlightCardProps = {
  carrierFsCode: string;
  flightNumber: string;
  departureTime: string;
  arrivalTime: string;
  policy?: PetPolicy;
};

export const FlightCard = ({
  carrierFsCode,
  flightNumber,
  departureTime,
  arrivalTime,
  policy,
}: FlightCardProps) => {
  return (
    <Card>
      <CardContent className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-6">
            <div>
              <p className="font-bold text-lg">{carrierFsCode}</p>
              <Badge variant="secondary" className="font-normal">
                {flightNumber}
              </Badge>
            </div>
            <div>
              <p className="text-sm text-gray-500">Departure</p>
              <p className="font-medium">
                {new Date(departureTime).toLocaleTimeString()}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Arrival</p>
              <p className="font-medium">
                {new Date(arrivalTime).toLocaleTimeString()}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <PawPrint className="h-5 w-5 text-primary" />
          </div>
        </div>
        
        {policy ? (
          <div className="text-sm space-y-2 border-t pt-4">
            {policy.pet_types_allowed?.length > 0 && (
              <p><span className="font-medium">Allowed pets:</span> {policy.pet_types_allowed.join(', ')}</p>
            )}
            {policy.carrier_requirements && (
              <p><span className="font-medium">Carrier requirements:</span> {policy.carrier_requirements}</p>
            )}
            {policy.documentation_needed?.length > 0 && (
              <p><span className="font-medium">Required documentation:</span> {policy.documentation_needed.join(', ')}</p>
            )}
            {policy.temperature_restrictions && (
              <p><span className="font-medium">Temperature restrictions:</span> {policy.temperature_restrictions}</p>
            )}
            {policy.breed_restrictions?.length > 0 && (
              <p><span className="font-medium">Breed restrictions:</span> {policy.breed_restrictions.join(', ')}</p>
            )}
            {policy.policy_url && (
              <a 
                href={policy.policy_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center text-primary hover:text-primary/80 mt-2"
              >
                View full policy <ExternalLink className="h-4 w-4 ml-1" />
              </a>
            )}
          </div>
        ) : (
          <p className="text-sm text-gray-500 border-t pt-4">
            No specific pet policy information available for this airline. Please contact the airline directly.
          </p>
        )}
      </CardContent>
    </Card>
  );
};