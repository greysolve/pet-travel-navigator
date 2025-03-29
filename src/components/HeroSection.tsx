
export const HeroSection = () => {
  return (
    <div className="relative bg-gradient-to-r from-primary to-secondary py-20">
      <div className="container relative mx-auto px-4">
        <div className="flex flex-col items-center text-center">
          <div className="relative mb-3">
            <div className="absolute -left-60 -top-10 hidden md:block">
              <img 
                src="/lovable-uploads/4fa0e6bf-3de6-410b-923b-207269a120a1.png" 
                alt="Petjumper.com Logo" 
                className="h-40 w-40 object-contain"
              />
            </div>
            <h1 className="text-5xl md:text-6xl font-bold text-primary-foreground">Petjumper.com</h1>
          </div>
          
          <p className="text-xl md:text-2xl text-primary-foreground/90 max-w-2xl mx-auto mb-8">
            Find pet-friendly flights for your furry travel companion
          </p>
          
          <div className="flex gap-8 mt-2">
            <a href="/us-pet-travel" className="text-primary-foreground/90 hover:text-primary-foreground underline underline-offset-4 text-lg">
              US Pet Travel
            </a>
            <a href="/eu-pet-passport" className="text-primary-foreground/90 hover:text-primary-foreground underline underline-offset-4 text-lg">
              EU Pet Passport
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
