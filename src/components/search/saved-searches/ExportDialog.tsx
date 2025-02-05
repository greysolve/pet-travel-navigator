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

      console.log("Starting PDF export with enhanced quality settings");

      // Apply pre-rendering styles to ensure text alignment
      const styleSheet = document.createElement('style');
      styleSheet.textContent = `
        #pdf-export-content * {
          transform: none !important;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
          line-height: 1.5 !important;
        }
        #pdf-export-content h1, #pdf-export-content h2, #pdf-export-content h3 {
          margin: 1.5em 0 0.75em !important;
          font-weight: 600 !important;
        }
        #pdf-export-content p {
          margin: 0.75em 0 !important;
        }
        #pdf-export-content ul {
          margin: 0.5em 0 !important;
          padding-left: 1.5em !important;
        }
        #pdf-export-content li {
          margin: 0.25em 0 !important;
        }
      `;
      document.head.appendChild(styleSheet);

      // Optimize canvas settings for better quality
      const canvas = await html2canvas(element, {
        scale: 2, // Increased for sharper text
        useCORS: true,
        allowTaint: true,
        imageTimeout: 0,
        backgroundColor: '#ffffff',
        foreignObjectRendering: true,
        removeContainer: false,
        onclone: (document) => {
          const images = document.getElementsByTagName('img');
          for (let i = 0; i < images.length; i++) {
            images[i].style.maxWidth = '800px';
            images[i].style.height = 'auto';
          }
        }
      });

      console.log("Canvas generated, creating PDF with enhanced settings");

      // Create PDF with optimized settings
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'px',
        format: [canvas.width, canvas.height],
        compress: true,
        precision: 32, // Increased precision for better text rendering
        hotfixes: ['px_scaling'],
      });

      // Add metadata
      pdf.setProperties({
        title: `${filename} - PawsOnBoard Travel Requirements`,
        subject: 'Pet Travel Requirements and Flight Itinerary',
        author: 'PawsOnBoard',
        keywords: 'pet travel, flight itinerary, travel requirements',
        creator: 'PawsOnBoard PDF Export'
      });

      // Convert canvas to image with better quality
      const imgData = canvas.toDataURL('image/jpeg', 1.0); // Maximum quality

      // Add image to PDF with better quality settings
      pdf.addImage(imgData, 'JPEG', 0, 0, canvas.width, canvas.height, '', 'FAST');
      
      // Save with custom filename
      const safeFilename = filename.trim().replace(/[^a-zA-Z0-9-_]/g, '_');
      pdf.save(`${safeFilename}.pdf`);

      // Clean up the temporary style sheet
      document.head.removeChild(styleSheet);

      toast({
        title: "PDF Generated Successfully",
        description: "Your travel requirements have been exported to PDF",
      });

      console.log("PDF export completed successfully");
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