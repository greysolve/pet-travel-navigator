
import React from 'react';
import { cn } from "@/lib/utils";

// Type definitions
type JsonPrimitive = string | number | boolean | null;
type JsonArray = JsonValue[];
type JsonObject = { [key: string]: JsonValue };
type JsonValue = JsonPrimitive | JsonObject | JsonArray;

type PremiumFieldValue = {
  value: any;
  isPremiumField: true;
};

// Type guards
const isJsonObject = (value: JsonValue): value is JsonObject => {
  return value !== null && 
         typeof value === 'object' && 
         !Array.isArray(value);
};

const isJsonArray = (value: JsonValue): value is JsonArray => {
  return Array.isArray(value);
};

const isPremiumField = (value: any): value is PremiumFieldValue => {
  return value && 
         typeof value === 'object' && 
         'isPremiumField' in value && 
         'value' in value;
};

interface JsonRendererProps {
  data: JsonValue;
  depth?: number;
  path?: string[];
  className?: string;
}

export const JsonRenderer: React.FC<JsonRendererProps> = ({ 
  data, 
  depth = 0, 
  path = [],
  className
}) => {
  // Handle premium fields first
  if (isPremiumField(data)) {
    return (
      <JsonRenderer 
        data={data.value}
        depth={depth}
        path={path}
        className={className}
      />
    );
  }

  // Handle null/undefined
  if (data === null || data === undefined) {
    return (
      <span className={cn("text-gray-500 italic", className)}>
        (None specified)
      </span>
    );
  }

  // Handle arrays
  if (isJsonArray(data)) {
    return (
      <ul className={cn("list-disc list-inside space-y-2", className)}>
        {data.map((item, index) => (
          <li key={`${path.join('-')}-${index}`} className="ml-4">
            <JsonRenderer 
              data={item} 
              depth={depth + 1} 
              path={[...path, index.toString()]}
            />
          </li>
        ))}
      </ul>
    );
  }

  // Handle objects
  if (isJsonObject(data)) {
    return (
      <div className={cn("space-y-2", depth > 0 && "ml-4", className)}>
        {Object.entries(data).map(([key, value], index) => (
          <div key={`${path.join('-')}-${key}`} className="space-y-1">
            {/* Only show key if it's not a numeric index */}
            {isNaN(Number(key)) && (
              <div className="font-medium text-gray-700">
                {key}
              </div>
            )}
            <div className={cn(
              "text-gray-600",
              isJsonObject(value) || isJsonArray(value) ? "mt-2" : ""
            )}>
              <JsonRenderer 
                data={value} 
                depth={depth + 1} 
                path={[...path, key]}
              />
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Handle primitives
  return (
    <span className={cn("text-gray-600", className)}>
      {String(data)}
    </span>
  );
};

