export type FlightData = {
  carrierFsCode: string;
  flightNumber: string;
  departureTime: string;
  arrivalTime: string;
  arrivalCountry?: string;
  airlineName?: string;
};

export type SearchSectionProps = {
  onSearchResults: (flights: FlightData[]) => void;
};