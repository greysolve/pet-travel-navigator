
import { JsonRenderer } from "@/components/ui/json-renderer";

interface PolicyValueProps {
  value: any;
}

export const PolicyValue = ({ value }: PolicyValueProps) => {
  // Handle arrays
  if (Array.isArray(value)) {
    return value.length > 0 ? (
      <ul className="list-disc list-inside">
        {value.map((item, index) => (
          <li key={index} className="text-gray-600">{item}</li>
        ))}
      </ul>
    ) : (
      <p className="text-gray-500 italic">None specified</p>
    );
  }
  
  // Handle strings
  if (typeof value === 'string') {
    return <p className="text-gray-600">{value}</p>;
  }
  
  // Handle null/undefined
  if (value === null || value === undefined) {
    return <p className="text-gray-500 italic">None specified</p>;
  }
  
  // Handle objects and other types
  return <JsonRenderer data={value} />;
};
