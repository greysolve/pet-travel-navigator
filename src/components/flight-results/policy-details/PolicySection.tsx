
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
    <div className="policy-content">
      <p className="font-medium mb-2 text-[#0EA5E9]">{title}:</p>
      <PolicyField value={data} />
    </div>
  );
};
