
import { PostgrestError, PostgrestResponse } from '@supabase/supabase-js';
import { Database } from '@/integrations/supabase/types';

export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row'];
export type Enums<T extends keyof Database['public']['Enums']> = Database['public']['Enums'][T];
export type TablesInsert<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert'];
export type TablesUpdate<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update'];

export type SafeResponse<T> = PostgrestResponse<T>;
export type SafePromise<T> = Promise<PostgrestResponse<T>>;

export type DatabaseRecord = {
  id: string;
  [key: string]: any;
};

export function isError<T>(
  result: T | PostgrestError
): result is PostgrestError {
  return (result as PostgrestError)?.code !== undefined;
}

export function isSingleRecord<T extends DatabaseRecord>(
  data: T | T[] | null
): data is T {
  return data !== null && !Array.isArray(data);
}

export function ensureArray<T>(data: T | T[] | null): T[] {
  if (!data) return [];
  return Array.isArray(data) ? data : [data];
}

// Type guard for checking if Supabase response contains data
export function hasData<T>(
  response: PostgrestResponse<T>
): response is { data: T; error: null } {
  return response.data !== null && response.error === null;
}

// Helper to safely handle Supabase query results
export async function handleQueryResult<T>(
  queryPromise: Promise<PostgrestResponse<T>>
): Promise<T | null> {
  const { data, error } = await queryPromise;
  if (error) {
    console.error('Query error:', error);
    return null;
  }
  return data;
}

export type Country = Tables<'countries'>;
export type Profile = Tables<'profiles'>;
export type UserRole = Tables<'user_roles'>;
export type Airline = Tables<'airlines'>;
export type PetPolicy = Tables<'pet_policies'>;
export type SavedSearch = Tables<'saved_searches'>;
export type Airport = {
  iata_code: string;
  name: string;
  city: string;
  country: string;
};

