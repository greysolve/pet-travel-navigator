
import { PetTravelWallet } from "@/components/profile/PetTravelWallet";
import { PageLayout } from "@/components/layout/PageLayout";

const Pets = () => {
  return (
    <PageLayout>
      <div className="max-w-[70%] mx-auto py-8">
        <h1 className="text-3xl font-bold text-center mb-8">My Pets</h1>
        <PetTravelWallet />
      </div>
    </PageLayout>
  );
};

export default Pets;
