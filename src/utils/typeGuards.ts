
/**
 * Type guard to check if a value is a non-null object
 */
export const isObject = (value: any): value is Record<string, any> => {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
};
