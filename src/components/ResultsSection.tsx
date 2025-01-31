import { Card } from "@/components/ui/card";

export const ResultsSection = ({ searchPerformed }: { searchPerformed: boolean }) => {
  if (!searchPerformed) return null;

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Flight results will go here */}
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Destination Pet Policy</h2>
          <p className="text-gray-700">
            Pets entering this destination must have:
            <ul className="list-disc list-inside mt-2 space-y-2">
              <li>Valid pet passport</li>
              <li>Up-to-date vaccinations</li>
              <li>Microchip identification</li>
              <li>Health certificate issued within 10 days of travel</li>
            </ul>
          </p>
        </div>
      </div>
    </div>
  );
};