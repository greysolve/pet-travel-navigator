
export type { CountryPolicy } from '../components/flight-results/types';

// Add definition for Airline type
export interface Airline {
  id: string;
  iata_code: string;
  name: string;
  active_policy_id?: string;
  website?: string;
  active?: boolean;
}
