import { PawPrint } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AuthDialog } from "./AuthDialog";

export const HeroSection = () => {
  return (
    <div className="bg-primary py-16">
      <div className="flex flex-col items-center justify-center px-4">
        <div className="w-full max-w-[600px] text-center space-y-8">
          <div className="flex items-center justify-center gap-4 text-primary-foreground">
            <PawPrint className="h-16 w-16" />
            <h1 className="text-6xl font-bold">PawPort</h1>
          </div>
          
          <p className="text-2xl text-primary-foreground/90">
            Find pet-friendly flights for your furry travel companion
          </p>

          <div className="flex items-center justify-center mt-8">
            <AuthDialog />
          </div>
        </div>
      </div>
    </div>
  );
};