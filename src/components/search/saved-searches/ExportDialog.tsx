import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PdfExportView } from "../PdfExportView";
import { useToast } from "@/hooks/use-toast";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import type { FlightData, PetPolicy, CountryPolicy } from "../../flight-results/types";

interface ExportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  flights: FlightData[];
  petPolicies?: Record<string, PetPolicy>;
  countryPolicies?: CountryPolicy[];
}

export const ExportDialog = ({
  isOpen,
  onClose,
  flights,
  petPolicies,
  countryPolicies,
}: ExportDialogProps) => {
  const [isExporting, setIsExporting] = useState(false);
  const [filename, setFilename] = useState("travel-requirements");
  const { toast } = useToast();

  const handleExport = async () => {
    if (!filename.trim()) {
      toast({
        title: "Filename required",
        description: "Please enter a filename for your PDF",
        variant: "destructive",
      });
      return;
    }

    setIsExporting(true);
    try {
      const element = document.getElementById('pdf-export-content');
      if (!element) {
        throw new Error("Export content not found");
      }

      const canvas = await html2canvas(element, {
        scale: 2,
        logging: false,
        useCORS: true,
        allowTaint: true,
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'px',
        format: [canvas.width / 2, canvas.height / 2],
      });

      // Add metadata to the PDF
      pdf.setProperties({
        title: `${filename} - PawsOnBoard Travel Requirements`,
        subject: 'Pet Travel Requirements and Flight Itinerary',
        author: 'PawsOnBoard',
        keywords: 'pet travel, flight itinerary, travel requirements',
        creator: 'PawsOnBoard PDF Export'
      });

      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width / 2, canvas.height / 2);
      
      // Save with custom filename
      const safeFilename = filename.trim().replace(/[^a-zA-Z0-9-_]/g, '_');
      pdf.save(`${safeFilename}.pdf`);

      toast({
        title: "PDF Generated Successfully",
        description: "Your travel requirements have been exported to PDF",
      });
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({
        title: "Export Failed",
        description: "There was an error generating your PDF. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Export Travel Requirements</DialogTitle>
        </DialogHeader>

        <div className="flex items-center gap-4 mb-4">
          <div className="flex-1">
            <Input
              placeholder="Enter filename"
              value={filename}
              onChange={(e) => setFilename(e.target.value)}
              className="w-full"
              disabled={isExporting}
            />
          </div>
          <Button 
            onClick={handleExport}
            disabled={isExporting}
            className="min-w-[150px]"
          >
            {isExporting ? "Generating PDF..." : "Download PDF"}
          </Button>
        </div>

        <div id="pdf-export-content">
          <PdfExportView
            flights={flights}
            petPolicies={petPolicies}
            countryPolicies={countryPolicies}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};