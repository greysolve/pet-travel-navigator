
import { Star } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

interface PremiumFeatureProps {
  title: string;
  children: React.ReactNode;
  className?: string;
}

export const PremiumFeature = ({ title, children, className }: PremiumFeatureProps) => {
  const { profile } = useAuth();
  const showPremiumIndicator = profile?.userRole === 'pet_caddie' || !profile?.userRole;

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center gap-2">
        <p className="font-medium">{title}</p>
        {showPremiumIndicator && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <Star className="h-4 w-4 fill-[#F97316] text-[#F97316]" />
              </TooltipTrigger>
              <TooltipContent>
                <p>Premium feature - Upgrade to access</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
      {children}
    </div>
  );
};
