
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

      console.log("Starting PDF export with enhanced text spacing settings");

      const canvas = await html2canvas(element, {
        scale: 1.5,
        logging: false,
        useCORS: true,
        allowTaint: true,
        imageTimeout: 0,
        backgroundColor: '#ffffff',
        onclone: (clonedDoc) => {
          const exportElement = clonedDoc.getElementById('pdf-export-content');
          if (exportElement instanceof HTMLElement) {
            exportElement.style.wordSpacing = '0.05em';
            exportElement.style.letterSpacing = '0.01em';
            exportElement.style.lineHeight = '1.5';
          }

          // Handle headings
          const headings = clonedDoc.querySelectorAll('h1, h2, h3');
          headings.forEach((heading) => {
            if (heading instanceof HTMLElement) {
              heading.style.marginBottom = '1em';
              heading.style.marginTop = '0.5em';
              heading.style.wordSpacing = '0.1em';
              heading.style.letterSpacing = '0.02em';
              heading.style.fontKerning = 'normal';
              heading.style.textRendering = 'optimizeLegibility';
            }
          });

          // Handle paragraphs and list items
          const textElements = clonedDoc.querySelectorAll('p, li');
          textElements.forEach((element) => {
            if (element instanceof HTMLElement) {
              element.style.wordSpacing = '0.05em';
              element.style.letterSpacing = '0.01em';
              element.style.marginBottom = '0.5em';
              element.style.lineHeight = '1.6';
              element.style.fontKerning = 'normal';
              element.style.textRendering = 'optimizeLegibility';
            }
          });

          // Ensure proper list spacing
          const lists = clonedDoc.querySelectorAll('ul, ol');
          lists.forEach((list) => {
            if (list instanceof HTMLElement) {
              list.style.paddingLeft = '2em';
              list.style.marginBottom = '1em';
              list.style.marginTop = '0.5em';
            }
          });
        }
      });

      console.log("Canvas generated with enhanced text spacing, creating PDF");

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'px',
        format: [canvas.width, canvas.height],
        compress: true,
        hotfixes: ['px_scaling'],
      });

      pdf.setProperties({
        title: `${filename} - PawsOnBoard Travel Requirements`,
        subject: 'Pet Travel Requirements and Flight Itinerary',
        author: 'PawsOnBoard',
        keywords: 'pet travel, flight itinerary, travel requirements',
        creator: 'PawsOnBoard PDF Export'
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      
      pdf.addImage(imgData, 'JPEG', 0, 0, canvas.width, canvas.height, '', 'MEDIUM');
      
      const safeFilename = filename.trim().replace(/[^a-zA-Z0-9-_]/g, '_');
      pdf.save(`${safeFilename}.pdf`);

      toast({
        title: "PDF Generated Successfully",
        description: "Your travel requirements have been exported to PDF",
      });

      console.log("PDF export completed successfully with enhanced text spacing");
      onClose();
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
      <DialogContent className="w-full max-w-7xl min-h-[90dvh] md:h-[90vh] overflow-y-auto p-4 md:p-6">
        <DialogHeader>
          <DialogTitle>Export Travel Requirements</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-4 mb-4">
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
            className="w-full md:w-auto md:min-w-[150px]"
          >
            {isExporting ? "Generating PDF..." : "Download PDF"}
          </Button>
        </div>

        <div id="pdf-export-content" className="bg-white">
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
