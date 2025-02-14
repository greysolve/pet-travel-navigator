
import type { FlightData } from "../../flight-results/types";

export const getSearchCountries = (flights: FlightData[]): string[] => {
  return Array.from(flights.reduce((countries: Set<string>, journey) => {
    journey.segments?.forEach(segment => {
      if (segment.departureCountry) countries.add(segment.departureCountry);
      if (segment.arrivalCountry) countries.add(segment.arrivalCountry);
    });
    return countries;
  }, new Set<string>()));
};
