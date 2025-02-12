
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { useProfile } from "@/contexts/ProfileContext";

interface PremiumFeatureProps {
  title: string;
  children: React.ReactNode;
  className?: string;
}

export const PremiumFeature = ({ title, children, className }: PremiumFeatureProps) => {
  const { profile } = useProfile();
  const showPremiumIndicator = profile?.userRole === 'pet_caddie' || !profile?.userRole;

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center gap-2">
        <p className="font-medium">{title}</p>
        {showPremiumIndicator && (
          <Badge 
            className="bg-[#F97316] hover:bg-[#F97316]/90 text-white text-xs"
          >
            Upgrade To View
          </Badge>
        )}
      </div>
      {children}
    </div>
  );
};
