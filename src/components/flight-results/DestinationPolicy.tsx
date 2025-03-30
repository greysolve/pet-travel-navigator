
import { TestTube, Microscope, MapPin } from "lucide-react";
import type { CountryPolicy } from "./types";
import { PolicyHeader } from "./policy-details/PolicyHeader";
import { RequirementSection } from "./policy-details/RequirementSection";
import { JsonSection } from "./policy-details/JsonSection";
import { IconSection } from "./policy-details/IconSection";
import { TextSection } from "./policy-details/TextSection";
import { NotesSection } from "./policy-details/NotesSection";
import { EmptyPolicy } from "./policy-details/EmptyPolicy";

export const DestinationPolicy = ({ policy }: { policy?: CountryPolicy | null }) => {
  if (!policy) {
    return (
      <EmptyPolicy 
        title="Destination Pet Policy" 
        message="No pet policy information available for this destination." 
      />
    );
  }

  return (
    <div className="bg-white p-8 rounded-lg">
      <PolicyHeader 
        title={policy.title}
        policyType={policy.policy_type}
        policyUrl={policy.policy_url}
      />
      
      {policy.description && (
        <p className="text-gray-700 text-lg leading-relaxed mb-8">{policy.description}</p>
      )}

      <div className="space-y-8">
        <RequirementSection 
          title="Vaccination Requirements" 
          requirements={policy.vaccination_requirements} 
        />

        <RequirementSection 
          title="Requirements" 
          requirements={policy.requirements} 
        />

        <RequirementSection 
          title="Required Documentation" 
          requirements={policy.documentation_needed} 
        />

        <JsonSection 
          title="Fees" 
          data={policy.fees} 
        />

        <JsonSection 
          title="Restrictions" 
          data={policy.restrictions} 
        />

        <IconSection 
          title="Blood Tests" 
          icon={TestTube} 
          content={policy.all_blood_tests} 
        />

        <IconSection 
          title="Other Biological Tests" 
          icon={Microscope} 
          content={policy.all_other_biological_tests} 
        />

        <IconSection 
          title="Entry Port Requirements" 
          icon={MapPin} 
          content={policy.required_ports_of_entry} 
        />

        <TextSection 
          title="Quarantine Requirements" 
          content={policy.quarantine_requirements} 
        />

        <NotesSection notes={policy.additional_notes} />
      </div>
    </div>
  );
};
