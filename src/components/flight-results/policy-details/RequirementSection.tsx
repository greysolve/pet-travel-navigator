
import { JsonRenderer } from "@/components/ui/json-renderer";

interface RequirementSectionProps {
  title: string;
  requirements?: string[];
}

export const RequirementSection = ({ title, requirements }: RequirementSectionProps) => {
  if (!requirements?.length) {
    return null;
  }

  return (
    <section>
      <h3 className="text-xl font-semibold tracking-normal text-gray-900 mb-4">{title}</h3>
      <JsonRenderer data={requirements} className="ml-2" />
    </section>
  );
};
