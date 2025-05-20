
import { SyncType } from '@/types/sync';

export interface SyncData {
  clear?: boolean;
  resumeSync?: boolean;
  mode?: string;
  countryName?: string;
  offset?: number;
  limit?: number;
  airlines?: string[];
}

export function getSyncEndpointAndData(
  syncType: keyof typeof SyncType, 
  clearData: boolean,
  resumeSync: boolean = false,
  mode: string = 'clear',
  currentOffset: number = 0,
  options: any = {}
): { endpoint: string; data: SyncData } {
  
  let endpoint = '';
  let data: SyncData = {};
  
  switch (syncType) {
    case 'airlines':
      endpoint = 'sync_airline_data';
      data = { clear: clearData };
      break;
    
    case 'airports':
      endpoint = 'sync_airport_data';
      data = { clear: clearData };
      break;
      
    case 'countryPolicies':
      endpoint = 'analyze_countries_policies';
      data = { 
        resumeSync, 
        mode, 
        countryName: mode !== 'clear' ? mode : undefined,
        offset: currentOffset
      };
      break;
      
    case 'petPolicies':
      endpoint = 'analyze_pet_policies';
      data = { 
        resumeSync, 
        mode: clearData ? 'clear' : 'update',
        offset: currentOffset,
        limit: options.batchSize || 10,
        airlines: options.airlines
      };
      break;
      
    default:
      throw new Error(`Unknown sync type: ${syncType}`);
  }
  
  return { endpoint, data };
}
