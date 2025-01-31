import { useState } from "react";
import { HeroSection } from "@/components/HeroSection";
import { SearchSection } from "@/components/SearchSection";
import { ResultsSection } from "@/components/ResultsSection";

const Index = () => {
  const [searchPerformed, setSearchPerformed] = useState(false);

  return (
    <div className="min-h-screen bg-[#F1F0FB]">
      <HeroSection />
      <SearchSection />
      <ResultsSection searchPerformed={searchPerformed} />
    </div>
  );
};

export default Index;