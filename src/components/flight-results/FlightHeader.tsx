import { Badge } from "@/components/ui/badge";

type FlightHeaderProps = {
  carrierFsCode: string;
  airlineName?: string;
  flightNumber: string;
  departureTime: string;
  arrivalTime: string;
};

export const FlightHeader = ({
  carrierFsCode,
  airlineName,
  flightNumber,
  departureTime,
  arrivalTime,
}: FlightHeaderProps) => {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center space-x-6">
        <div>
          <p className="font-bold text-lg">
            {airlineName || carrierFsCode}{" "}
            <span className="text-sm font-normal text-gray-500">
              ({carrierFsCode})
            </span>
          </p>
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
    </div>
  );
};