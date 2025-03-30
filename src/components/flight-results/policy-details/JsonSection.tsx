
import { JsonRenderer } from "@/components/ui/json-renderer";

interface JsonSectionProps {
  title: string;
  data: any;
}

export const JsonSection = ({ title, data }: JsonSectionProps) => {
  if (!data) {
    return null;
  }

  return (
    <section>
      <h3 className="text-xl font-semibold tracking-normal text-gray-900 mb-4">{title}</h3>
      <div className="bg-gray-50 p-4 rounded-lg">
        <JsonRenderer data={data} />
      </div>
    </section>
  );
};
