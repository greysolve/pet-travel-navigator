import { AuthDialog } from "./AuthDialog";

export const HeroSection = () => {
  return (
    <div className="relative bg-primary py-12">
      {/* Auth Dialog positioned absolutely in top right */}
      <div className="absolute top-4 right-4">
        <AuthDialog />
      </div>
      
      <div className="relative">
        <div className="flex flex-col items-center gap-8 max-w-2xl mx-auto">
          <div className="flex items-center gap-8 relative w-full">
            <div className="absolute -left-44 -top-8">
              <img 
                src="/lovable-uploads/4fa0e6bf-3de6-410b-923b-207269a120a1.png" 
                alt="Petjumper.com Logo" 
                className="h-56 w-56 object-contain"
              />
            </div>
            <h1 className="text-5xl font-bold text-primary-foreground mx-auto">Petjumper.com</h1>
          </div>
          
          <p className="text-2xl text-primary-foreground/90 max-w-xl text-center">
            Find pet-friendly flights for your furry travel companion
          </p>
        </div>
      </div>
    </div>
  );
};