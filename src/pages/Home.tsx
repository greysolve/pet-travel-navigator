import { SearchSection } from "@/components/SearchSection";
import { HeroSection } from "@/components/HeroSection";
import { ResultsSection } from "@/components/ResultsSection";

const Home = () => {
  return (
    <div className="space-y-8">
      <HeroSection />
      <SearchSection />
      <ResultsSection />
    </div>
  );
};

export default Home;