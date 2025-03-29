
export type ApiProvider = 'cirium' | 'amadeus';

export interface SearchRequest {
  origin: string;
  destination: string;
  date: string;
  api?: ApiProvider;
  enable_fallback?: boolean;
}

export interface FlightSegment {
  carrierFsCode: string;
  flightNumber: string;
  departureTime: string;
  arrivalTime: string;
  departureAirportFsCode: string;
  arrivalAirportFsCode: string;
  departureTerminal?: string;
  arrivalTerminal?: string;
  stops: number;
  elapsedTime: number;
  isCodeshare: boolean;
  codeshares?: any[];
  departureCountry?: string;
  arrivalCountry?: string;
}

export interface FlightData {
  segments: FlightSegment[];
  totalDuration: number;
  stops: number;
  origin: {
    country?: string;
    code: string;
  };
  destination: {
    country?: string;
    code: string;
  };
}

export interface SearchResponse {
  connections: FlightData[];
  api_provider: ApiProvider | null;
  fallback_used: boolean;
  error: string | null;
  fallback_error: string | null;
}
