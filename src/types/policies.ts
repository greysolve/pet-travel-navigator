
export type { CountryPolicy } from '../components/flight-results/types';

// Update Airline type to match actual database schema
export interface Airline {
  id: string;
  iata_code: string;
  name: string;
  website?: string;
  active?: boolean;
}

