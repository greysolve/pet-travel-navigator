
import { Badge } from "@/components/ui/badge";
import type { PolicyType } from "../types";

interface PolicyBadgeProps {
  type: PolicyType;
}

export const getPolicyTypeLabel = (type: PolicyType) => {
  return type === 'pet_arrival' ? 'Arrival Policy' : 'Transit Policy';
};

export const getPolicyTypeBadgeColor = (type: PolicyType) => {
  return type === 'pet_arrival' ? 'bg-primary' : 'bg-secondary';
};

export const PolicyBadge = ({ type }: PolicyBadgeProps) => {
  return (
    <Badge className={`${getPolicyTypeBadgeColor(type)} shrink-0`}>
      {getPolicyTypeLabel(type)}
    </Badge>
  );
};
