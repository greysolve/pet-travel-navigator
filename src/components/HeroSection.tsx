
import { useUser } from "@/contexts/user/UserContext";

export const HeroSection = () => {
  const { user } = useUser();

  return (
    <>
      {/* Header */}
      <header className="bg-gradient-to-r from-[#1a365d] to-[#2d5a87] text-[#f7f1e8] py-4 shadow-[0_4px_15px_rgba(26,54,93,0.3)]">
        <div className="max-w-6xl mx-auto px-5 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-[#d4af37] to-[#f4d03f] rounded-full flex items-center justify-center text-2xl text-[#1a365d] font-bold">
              ✈️
            </div>
            <div className="text-3xl font-bold text-[#d4af37] font-serif">
              PetJumper Premium
            </div>
          </div>
          
          {user && (
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-[#d4af37] rounded-full flex items-center justify-center text-[#1a365d] font-bold">
                {user.email?.[0]?.toUpperCase() || 'U'}
              </div>
              <span className="text-[#f7f1e8]">
                {user.user_metadata?.full_name || user.email?.split('@')[0] || 'User'}
              </span>
            </div>
          )}
        </div>
      </header>

      {/* Hero Section */}
      <div className="relative bg-gradient-to-br from-[#1a365d] via-[#2d5a87] to-[#8b0000] text-[#f7f1e8] py-16 text-center">
        {/* Luxury Pattern Overlay */}
        <div 
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage: `url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1200 400'><defs><pattern id='luxury' x='0' y='0' width='80' height='80' patternUnits='userSpaceOnUse'><circle cx='40' cy='40' r='1.5' fill='%23d4af37' opacity='0.3'/></pattern></defs><rect width='1200' height='400' fill='url(%23luxury)'/></svg>")`
          }}
        />
        
        <div className="container relative mx-auto px-4 z-10">
          <div className="flex flex-col items-center text-center">
            <h1 className="text-5xl md:text-6xl font-light text-[#f7f1e8] mb-4 font-serif leading-tight">
              Cabin-Only Airlines for Dogs Under 15lbs (7kg)
            </h1>
            
            <p className="text-2xl text-[#d4af37] mb-8 font-serif italic">
              Premium Travel Search for Discerning Small Dog Parents
            </p>
            
            <div className="flex flex-col md:flex-row gap-6 mt-8">
              <a 
                href="/us-pet-travel" 
                className="px-6 py-3 border-2 border-[#d4af37] rounded-lg text-[#d4af37] hover:bg-[#d4af37] hover:text-[#1a365d] transition-all duration-300 font-bold bg-[rgba(212,175,55,0.1)]"
              >
                US Premium Travel
              </a>
              <a 
                href="/eu-pet-passport" 
                className="px-6 py-3 border-2 border-[#d4af37] rounded-lg text-[#d4af37] hover:bg-[#d4af37] hover:text-[#1a365d] transition-all duration-300 font-bold bg-[rgba(212,175,55,0.1)]"
              >
                EU Pet Passport
              </a>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
