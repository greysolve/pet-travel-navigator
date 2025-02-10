
import { PostgrestError } from '@supabase/supabase-js';

export type SafePromise<T> = Promise<{
  data: T | null;
  error: PostgrestError | null;
}>;

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
  response: { data: T | null; error: PostgrestError | null }
): response is { data: T; error: null } {
  return response.data !== null && response.error === null;
}
