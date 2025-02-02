import { ContactInformation } from "@/components/profile/ContactInformation";
import { AddressInformation } from "@/components/profile/AddressInformation";
import { ProfileAvatar } from "@/components/profile/ProfileAvatar";
import { PetTravelWallet } from "@/components/profile/PetTravelWallet";

const Profile = () => {
  return (
    <div className="container py-8 space-y-8">
      <h1 className="text-3xl font-bold">Profile</h1>
      
      <div className="grid gap-8">
        <ProfileAvatar />
        
        <div className="grid gap-8 md:grid-cols-2">
          <ContactInformation />
          <AddressInformation />
        </div>

        <PetTravelWallet />
      </div>
    </div>
  );
};

export default Profile;