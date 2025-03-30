
import { isPremiumContent } from "../types";
import { PremiumField } from "./PremiumField";
import { PolicyValue } from "./PolicyValue";

interface PolicyFieldProps {
  value: any;
  label?: string;
}

export const PolicyField = ({ value, label }: PolicyFieldProps) => {
  if (isPremiumContent(value)) {
    return <PremiumField value={value} label={label} />;
  }
  return <PolicyValue value={value} />;
};
