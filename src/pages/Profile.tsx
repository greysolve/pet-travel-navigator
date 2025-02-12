
import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { PetTravelWallet } from "@/components/profile/PetTravelWallet";
import { useToast } from "@/hooks/use-toast";
import { useProfile } from "@/contexts/ProfileContext";
import { useAuth } from "@/contexts/AuthContext";
import { ProfileHeader } from "@/components/profile/ProfileHeader";
import { ProfileForm } from "@/components/profile/ProfileForm";

const Profile = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const { profile, updateProfile: updateProfileContext } = useProfile();
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    addressLine1: "",
    addressLine2: "",
    addressLine3: "",
    locality: "",
    administrativeArea: "",
    postalCode: "",
    selectedCountryId: "",
  });

  useEffect(() => {
    if (profile) {
      const fullName = profile.full_name || "";
      const [firstName = "", lastName = ""] = fullName.split(" ");
      setFormData({
        firstName,
        lastName,
        addressLine1: profile.address_line1 || "",
        addressLine2: profile.address_line2 || "",
        addressLine3: profile.address_line3 || "",
        locality: profile.locality || "",
        administrativeArea: profile.administrative_area || "",
        postalCode: profile.postal_code || "",
        selectedCountryId: profile.country_id || "",
      });
    }
  }, [profile]);

  const handleProfileUpdate = async (updates: any) => {
    if (!profile?.id) return;
    
    try {
      await updateProfileContext(updates);
      toast({
        title: "Success",
        description: "Profile updated successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update profile.",
        variant: "destructive",
      });
    }
  };

  if (!profile) {
    return null;
  }

  return (
    <div className="container mx-auto px-4 md:px-8 py-8 pt-[15vh] md:pt-8 max-w-full md:max-w-[70%]">
      <h1 className="text-3xl font-bold text-center">Profile</h1>
      
      <div className="grid gap-8">
        <ProfileHeader 
          userId={user?.id || ""}
          avatarUrl={profile.avatar_url}
        />
        
        <ProfileForm
          email={user?.email || ""}
          initialData={formData}
          onSubmit={handleProfileUpdate}
        />

        <Card>
          <CardContent className="pt-6">
            <PetTravelWallet />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Profile;
