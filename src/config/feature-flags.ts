
// Feature flag configuration

// API Provider settings
export type ApiProvider = 'cirium' | 'amadeus';

// Default API provider to use for flight searches
export const DEFAULT_API_PROVIDER: ApiProvider = 'amadeus';

// Enable API provider selection in the UI
export const ENABLE_API_PROVIDER_SELECTION = true;

// When true, if the primary API fails, we'll try the fallback API
export const ENABLE_API_FALLBACK = true;

// Track metrics about API performance
export const TRACK_API_METRICS = true;
