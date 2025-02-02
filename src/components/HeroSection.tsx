import { AuthDialog } from "./AuthDialog";

export const HeroSection = () => {
  return (
    <div className="relative bg-primary py-16">
      {/* Auth Dialog positioned absolutely in top right */}
      <div className="absolute top-4 right-4">
        <AuthDialog />
      </div>
      
      <div className="flex flex-col items-start px-4"> {/* Changed from items-center to items-start */}
        <div className="w-full max-w-[600px] text-left space-y-8"> {/* Changed from text-center to text-left */}
          <div className="flex flex-col items-start gap-4"> {/* Changed from items-center to items-start */}
            <img 
              src="/lovable-uploads/399508ba-b0c4-4f26-b40a-210fb735a14c.png" 
              alt="PawPort Logo" 
              className="h-[38.4px] w-[38.4px] object-contain" /* Increased size by 20% from 32px to 38.4px */
            />
            <h1 className="text-6xl font-bold text-primary-foreground">PawPort</h1>
          </div>
          
          <p className="text-2xl text-primary-foreground/90">
            Find pet-friendly flights for your furry travel companion
          </p>
        </div>
      </div>
    </div>
  );
};