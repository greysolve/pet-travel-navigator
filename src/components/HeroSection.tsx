
export const HeroSection = () => {
  return (
    <div className="relative bg-primary py-16">
      <div className="relative">
        <div className="flex flex-col items-center gap-12 max-w-3xl mx-auto px-4">
          <div className="flex items-center gap-12 relative w-full">
            <div className="absolute -left-40 -top-8 hidden md:block">
              <img 
                src="/lovable-uploads/4fa0e6bf-3de6-410b-923b-207269a120a1.png" 
                alt="Petjumper.com Logo" 
                className="h-48 w-48 object-contain"
              />
            </div>
            <h1 className="text-4xl md:text-6xl font-bold text-primary-foreground mx-auto">Petjumper.com</h1>
          </div>
          
          <p className="hidden md:block text-2xl text-primary-foreground/90 max-w-2xl text-center leading-relaxed">
            Find pet-friendly flights for your furry travel companion
          </p>
          
          <div className="flex gap-4 mt-4">
            <a href="/us-pet-travel" className="text-primary-foreground/90 hover:text-primary-foreground underline underline-offset-4">
              US Pet Travel
            </a>
            <a href="/eu-pet-passport" className="text-primary-foreground/90 hover:text-primary-foreground underline underline-offset-4">
              EU Pet Passport
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
