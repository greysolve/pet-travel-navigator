
import { useState, useRef } from "react";
import { DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PdfExportView } from "../PdfExportView";
import { MobileExportView } from "../MobileExportView";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
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
  const [exportError, setExportError] = useState<string | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const isMobile = useIsMobile();

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
    setExportError(null);
    
    try {
      const element = document.getElementById('pdf-export-content');
      if (!element) {
        throw new Error("Export content not found");
      }

      console.log(`Starting PDF export on ${isMobile ? 'mobile' : 'desktop'} device`);
      
      // Different settings for mobile vs desktop
      const scale = isMobile ? 1.2 : 1.5;
      const quality = isMobile ? 0.8 : 0.95;
      
      const canvas = await html2canvas(element, {
        scale: scale,
        logging: true, // Enable logging for debugging
        useCORS: true,
        allowTaint: true,
        imageTimeout: 0,
        backgroundColor: '#ffffff',
        onclone: (clonedDoc) => {
          const exportElement = clonedDoc.getElementById('pdf-export-content');
          if (exportElement instanceof HTMLElement) {
            // More spacing for better readability
            exportElement.style.wordSpacing = '0.05em';
            exportElement.style.letterSpacing = '0.01em';
            exportElement.style.lineHeight = '1.5';
            
            // If on mobile, make sure everything fits within the viewport width
            if (isMobile) {
              exportElement.style.width = '100%';
              exportElement.style.maxWidth = '100%';
              exportElement.style.overflowX = 'hidden';
            }
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

      console.log(`Canvas generated (${canvas.width}x${canvas.height}), creating PDF`);

      // Create PDF with proper dimensions based on the canvas
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'px',
        format: isMobile ? 'a4' : [canvas.width, canvas.height],
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

      const imgData = canvas.toDataURL('image/jpeg', quality);
      
      // Add image to PDF with proper scaling
      if (isMobile) {
        // For mobile, fit the image to the page width
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
        pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight, '', 'FAST');
      } else {
        // For desktop, use the original dimensions
        pdf.addImage(imgData, 'JPEG', 0, 0, canvas.width, canvas.height, '', 'MEDIUM');
      }
      
      const safeFilename = filename.trim().replace(/[^a-zA-Z0-9-_]/g, '_');
      pdf.save(`${safeFilename}.pdf`);

      toast({
        title: "PDF Generated Successfully",
        description: "Your travel requirements have been exported to PDF",
      });

      console.log(`PDF export completed successfully on ${isMobile ? 'mobile' : 'desktop'}`);
      onClose();
    } catch (error) {
      console.error('Error generating PDF:', error);
      setExportError(String(error));
      toast({
        title: "Export Failed",
        description: "There was an error generating your PDF. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  // For mobile devices, we'll use a simplified view
  return (
    <>
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

      {exportError && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
          <p className="font-semibold">Export Error:</p>
          <p className="text-xs overflow-auto max-h-20">{exportError}</p>
        </div>
      )}

      <div id="pdf-export-content" className="bg-white" ref={contentRef}>
        {isMobile ? (
          <MobileExportView
            flights={flights}
            petPolicies={petPolicies}
            countryPolicies={countryPolicies}
          />
        ) : (
          <PdfExportView
            flights={flights}
            petPolicies={petPolicies}
            countryPolicies={countryPolicies}
          />
        )}
      </div>
    </>
  );
};
