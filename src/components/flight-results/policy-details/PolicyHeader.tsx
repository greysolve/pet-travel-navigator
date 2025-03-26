
import { ExternalLink } from "lucide-react";
import { PolicyBadge } from "./PolicyBadge";
import type { PolicyType } from "../types";

interface PolicyHeaderProps {
  title: string;
  policyType: PolicyType;
  policyUrl?: string;
}

export const PolicyHeader = ({ title, policyType, policyUrl }: PolicyHeaderProps) => {
  return (
    <>
      <div className="flex items-center gap-4 mb-4">
        <PolicyBadge type={policyType} />
        <h2 className="text-2xl font-semibold tracking-normal leading-relaxed text-gray-900">{title}</h2>
      </div>
      
      {policyUrl && (
        <a 
          href={policyUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center text-primary hover:text-primary/80 mb-6"
        >
          Official requirements <ExternalLink className="h-4 w-4 ml-1" />
        </a>
      )}
    </>
  );
};
