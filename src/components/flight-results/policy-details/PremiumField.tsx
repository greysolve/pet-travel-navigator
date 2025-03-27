
import { PremiumFeature } from "@/components/ui/premium-feature";
import { JsonRenderer } from "@/components/ui/json-renderer";

type PremiumFieldValue = {
  value: any;
  isPremiumField: true;
};

export const isPremiumField = (value: any): value is PremiumFieldValue => {
  return value && typeof value === 'object' && 'isPremiumField' in value;
};

interface PremiumFieldProps {
  value: PremiumFieldValue;
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
