
import { PremiumFeature } from "@/components/ui/premium-feature";
import { JsonRenderer } from "@/components/ui/json-renderer";
import { PremiumContent, isPremiumContent } from "../types";

interface PremiumFieldProps {
  value: PremiumContent;
  label?: string;
}

export const PremiumField = ({ value, label }: PremiumFieldProps) => {
  return (
    <PremiumFeature title={label || ""}>
      <div className="blur-sm select-none">
        <JsonRenderer data={value.value} />
      </div>
    </PremiumFeature>
  );
};
