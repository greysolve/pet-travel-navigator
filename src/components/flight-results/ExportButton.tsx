
import React from "react";
import { Button } from "@/components/ui/button";
import { FileDown } from "lucide-react";

interface ExportButtonProps {
  onClick: () => void;
}

export const ExportButton = ({ onClick }: ExportButtonProps) => {
  return (
    <div className="flex justify-end">
      <Button
        variant="outline"
        onClick={onClick}
        className="gap-2"
      >
        <FileDown className="h-4 w-4" />
        Export Results
      </Button>
    </div>
  );
};
