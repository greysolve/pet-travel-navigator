
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { FileDown } from "lucide-react";
import { PolicyDetails } from "./PolicyDetails";
import { ExportDialog } from "../search/saved-searches/ExportDialog";
import type { PetPolicy } from "./types";

interface SinglePolicyResultProps {
  airlineName: string;
  policy: PetPolicy;
  canExport: boolean;
  isMobile?: boolean;
}

export const SinglePolicyResult = ({ 
  airlineName, 
  policy, 
  canExport,
  isMobile 
}: SinglePolicyResultProps) => {
  const [showExportDialog, setShowExportDialog] = useState(false);
  const petPolicies = { [airlineName]: policy };

  return (
    <div id="search-results" className="container mx-auto px-4 py-12 animate-fade-in">
      <div className="bg-white/80 backdrop-blur-lg rounded-lg shadow-lg p-6 text-left">
        {canExport && (
          <div className="flex justify-end mb-4">
            <Button
              variant="outline"
              onClick={() => setShowExportDialog(true)}
              className="gap-2"
            >
              <FileDown className="h-4 w-4" />
              Export Results
            </Button>
          </div>
        )}
        <h2 className="text-xl font-semibold mb-4">
          Pet Policy for {airlineName}
        </h2>
        <PolicyDetails policy={policy} />
      </div>

      <Dialog open={showExportDialog} onOpenChange={setShowExportDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <ExportDialog
            isOpen={showExportDialog}
            flights={[]}
            petPolicies={petPolicies}
            countryPolicies={[]}
            onClose={() => setShowExportDialog(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};
