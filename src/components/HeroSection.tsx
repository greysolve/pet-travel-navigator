import { AuthDialog } from "./AuthDialog";

export const HeroSection = () => {
  return (
    <div className="relative bg-primary py-16">
      {/* Auth Dialog positioned absolutely in top right */}
      <div className="absolute top-4 right-4">
        <AuthDialog />
      </div>
      
      <div className="flex flex-col items-center justify-center px-4">
        <div className="w-full max-w-[600px] text-center space-y-8">
          <div className="flex flex-col items-center justify-center gap-4">
            <img 
              src="/lovable-uploads/d9c1da0e-88b6-43d4-b6b4-5d79f681c06b.png" 
              alt="PawPort Logo" 
              className="h-32 w-32 object-contain"
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