
import { PolicyField } from "./PolicyField";

interface FeeDetailsProps {
  fees: Record<string, any>;
}

export const FeeDetails = ({ fees }: FeeDetailsProps) => {
  if (!fees || Object.keys(fees).length === 0) {
    return null;
  }

  return (
    <div>
      <p className="font-medium mb-2">Fees:</p>
      {Object.entries(fees).map(([key, value]) => (
        <div key={key} className="mb-2">
          <p className="text-gray-600 capitalize mb-1">
            {key.split('_').join(' ')}:
          </p>
          <PolicyField value={value} />
        </div>
      ))}
    </div>
  );
};
