
import { PetTravelWallet } from "@/components/profile/PetTravelWallet";
import AuthDialog from "@/components/AuthDialog";

const Pets = () => {
  return (
    <div className="container max-w-[70%] mx-auto py-8">
      <div className="flex justify-end mb-4">
        <AuthDialog />
      </div>
      <h1 className="text-3xl font-bold text-center mb-8">My Pets</h1>
      <PetTravelWallet />
    </div>
  );
};

export default Pets;
