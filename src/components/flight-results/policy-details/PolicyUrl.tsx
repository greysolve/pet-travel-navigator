
import { ExternalLink } from "lucide-react";
import { PremiumFeature } from "@/components/ui/premium-feature";
import { isPremiumField } from "./PremiumField";

interface PolicyUrlProps {
  policyUrl: any;
}

export const PolicyUrl = ({ policyUrl }: PolicyUrlProps) => {
  if (!policyUrl) {
    return null;
  }

  if (isPremiumField(policyUrl)) {
    return (
      <div>
        <PremiumFeature title="Full Policy">
          <div className="blur-sm select-none">
            <span className="inline-flex items-center text-primary">
              View full policy <ExternalLink className="h-4 w-4 ml-1" />
            </span>
          </div>
        </PremiumFeature>
      </div>
    );
  }

  return (
    <div>
      <a 
        href={policyUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center text-primary hover:text-primary/80"
      >
        View full policy <ExternalLink className="h-4 w-4 ml-1" />
      </a>
    </div>
  );
};
