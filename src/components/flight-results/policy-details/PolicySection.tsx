
import { PolicyField } from "./PolicyField";

interface PolicySectionProps {
  title: string;
  data: any;
}

export const PolicySection = ({ title, data }: PolicySectionProps) => {
  if (!data) {
    return null;
  }

  return (
    <div>
      <p className="font-medium mb-2">{title}:</p>
      <PolicyField value={data} />
    </div>
  );
};
