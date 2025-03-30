
import React from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ExportDialog } from "../search/saved-searches/ExportDialog";
import type { FlightData, PetPolicy, CountryPolicy } from "./types";

interface ExportDialogWrapperProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  flights: FlightData[];
  petPolicies?: Record<string, PetPolicy>;
  countryPolicies?: CountryPolicy[];
  isMobile?: boolean;
}

export const ExportDialogWrapper = ({
  isOpen,
  setIsOpen,
  flights,
  petPolicies,
  countryPolicies,
  isMobile
}: ExportDialogWrapperProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className={`${isMobile ? 'w-[95vw] max-w-[95vw]' : 'max-w-4xl'} max-h-[90vh] overflow-y-auto`}>
        <ExportDialog
          isOpen={isOpen}
          flights={flights}
          petPolicies={petPolicies || {}}
          countryPolicies={countryPolicies || []}
          onClose={() => setIsOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
};
