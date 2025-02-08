
import { ExternalLink, TestTube, Microscope, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { CountryPolicy, PolicyType } from "./types";

const getPolicyTypeLabel = (type: PolicyType) => {
  return type === 'pet_arrival' ? 'Arrival Policy' : 'Transit Policy';
};

const getPolicyTypeBadgeColor = (type: PolicyType) => {
  return type === 'pet_arrival' ? 'bg-primary' : 'bg-secondary';
};

// Enhanced helper to render JSON structures with hierarchical bullet points
const renderObjectValue = (value: any, depth: number = 0): string => {
  // Handle null/undefined
  if (value == null) return '';
  
  // Handle primitive values
  if (typeof value !== 'object') return String(value);
  
  // Handle arrays
  if (Array.isArray(value)) {
    return value.map(item => renderObjectValue(item, depth)).join('\n');
  }

  // For pure objects, use JSON.stringify if they're simple
  if (Object.keys(value).length === 0) return '';

  // Handle objects with hierarchical formatting
  return Object.entries(value)
    .map(([key, val]) => {
      const bullet = '•'.repeat(depth + 1);
      const indent = ' '.repeat(depth * 2);
      
      // For nested objects/arrays, continue recursion
      const renderedValue = renderObjectValue(val, depth + 1);
      
      // If the value is a primitive or empty after rendering, show on same line
      if (typeof val !== 'object' || !val || 
          (Array.isArray(val) && val.length === 0) || 
          (typeof val === 'object' && Object.keys(val).length === 0)) {
        return `${indent}${bullet} ${key}: ${renderedValue}`;
      }
      
      // For objects/arrays with content, render hierarchically
      return `${indent}${bullet} ${key}\n${renderedValue.split('\n').map(line => `${indent}  ${line}`).join('\n')}`;
    })
    .join('\n'); // Crucial: Join the mapped array into a single string
};

export const DestinationPolicy = ({ policy }: { policy?: CountryPolicy | null }) => {
  if (!policy) {
    return (
      <div className="bg-white p-6 rounded-lg">
        <h2 className="text-xl font-semibold tracking-normal mb-4">Destination Pet Policy</h2>
        <p className="text-gray-500 italic">No pet policy information available for this destination.</p>
      </div>
    );
  }

  return (
    <div className="bg-white p-8 rounded-lg">
      <div className="flex items-center gap-4 mb-4">
        <Badge className={`${getPolicyTypeBadgeColor(policy.policy_type)} shrink-0`}>
          {getPolicyTypeLabel(policy.policy_type)}
        </Badge>
        <h2 className="text-2xl font-semibold tracking-normal leading-relaxed text-gray-900">{policy.title}</h2>
      </div>
      
      {policy.policy_url && (
        <a 
          href={policy.policy_url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center text-primary hover:text-primary/80 mb-6"
        >
          Official requirements <ExternalLink className="h-4 w-4 ml-1" />
        </a>
      )}
      
      {policy.description && (
        <p className="text-gray-700 text-lg leading-relaxed mb-8">{policy.description}</p>
      )}

      <div className="space-y-8">
        {policy.vaccination_requirements?.length > 0 && (
          <section>
            <h3 className="text-xl font-semibold tracking-normal text-gray-900 mb-4">Vaccination Requirements</h3>
            <ul className="list-disc list-inside space-y-3 ml-2">
              {policy.vaccination_requirements.map((vac, index) => (
                <li key={index} className="text-gray-700 text-lg leading-relaxed pl-2">{vac}</li>
              ))}
            </ul>
          </section>
        )}

        {policy.requirements?.length > 0 && (
          <section>
            <h3 className="text-xl font-semibold tracking-normal text-gray-900 mb-4">Requirements</h3>
            <ul className="list-disc list-inside space-y-3 ml-2">
              {policy.requirements.map((req, index) => (
                <li key={index} className="text-gray-700 text-lg leading-relaxed pl-2">{req}</li>
              ))}
            </ul>
          </section>
        )}

        {policy.documentation_needed?.length > 0 && (
          <section>
            <h3 className="text-xl font-semibold tracking-normal text-gray-900 mb-4">Required Documentation</h3>
            <ul className="list-disc list-inside space-y-3 ml-2">
              {policy.documentation_needed.map((doc, index) => (
                <li key={index} className="text-gray-700 text-lg leading-relaxed pl-2">{doc}</li>
              ))}
            </ul>
          </section>
        )}

        {policy.fees && (
          <section>
            <h3 className="text-xl font-semibold tracking-normal text-gray-900 mb-4">Fees</h3>
            <pre className="text-gray-700 text-lg leading-relaxed whitespace-pre-wrap font-sans bg-gray-50 p-4 rounded-lg">
              {renderObjectValue(policy.fees)}
            </pre>
          </section>
        )}

        {policy.restrictions && (
          <section>
            <h3 className="text-xl font-semibold tracking-normal text-gray-900 mb-4">Restrictions</h3>
            <pre className="text-gray-700 text-lg leading-relaxed whitespace-pre-wrap font-sans bg-gray-50 p-4 rounded-lg">
              {renderObjectValue(policy.restrictions)}
            </pre>
          </section>
        )}

        {policy.all_blood_tests && (
          <section>
            <div className="flex items-center gap-2 mb-4">
              <TestTube className="h-5 w-5 text-primary" />
              <h3 className="text-xl font-semibold tracking-normal text-gray-900">Blood Tests</h3>
            </div>
            <p className="text-gray-700 text-lg leading-relaxed">{policy.all_blood_tests}</p>
          </section>
        )}

        {policy.all_other_biological_tests && (
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Microscope className="h-5 w-5 text-primary" />
              <h3 className="text-xl font-semibold tracking-normal text-gray-900">Other Biological Tests</h3>
            </div>
            <p className="text-gray-700 text-lg leading-relaxed">{policy.all_other_biological_tests}</p>
          </section>
        )}

        {policy.required_ports_of_entry && (
          <section>
            <div className="flex items-center gap-2 mb-4">
              <MapPin className="h-5 w-5 text-primary" />
              <h3 className="text-xl font-semibold tracking-normal text-gray-900">Entry Port Requirements</h3>
            </div>
            <p className="text-gray-700 text-lg leading-relaxed">{policy.required_ports_of_entry}</p>
          </section>
        )}

        {policy.quarantine_requirements && (
          <section>
            <h3 className="text-xl font-semibold tracking-normal text-gray-900 mb-4">Quarantine Requirements</h3>
            <p className="text-gray-700 text-lg leading-relaxed">{policy.quarantine_requirements}</p>
          </section>
        )}

        {policy.additional_notes && typeof policy.additional_notes === 'string' && (
          <section className="mt-8 p-6 bg-gray-50 rounded-lg">
            <p className="text-gray-600 text-lg leading-relaxed">{policy.additional_notes}</p>
          </section>
        )}
      </div>
    </div>
  );
};
