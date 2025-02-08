
import { PetTravelWallet } from "@/components/profile/PetTravelWallet";
import { PawPrint } from "lucide-react";

const Pets = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[rgba(223,234,247,1)] to-[rgba(244,248,252,1)]">
      <div className="container max-w-[70%] mx-auto py-12">
        <div className="text-center space-y-4 mb-12 animate-fade-in">
          <div className="flex items-center justify-center gap-3">
            <PawPrint className="h-8 w-8 text-primary" />
            <h1 className="text-4xl font-bold text-primary">My Pets</h1>
          </div>
          <p className="text-lg text-muted-foreground">
            Manage your pet travel companions
          </p>
        </div>
        <PetTravelWallet />
      </div>
    </div>
  );
};

export default Pets;
