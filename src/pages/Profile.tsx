
import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { PetTravelWallet } from "@/components/profile/PetTravelWallet";
import { useToast } from "@/hooks/use-toast";
import { useProfile } from "@/contexts/ProfileContext";
import { useAuth } from "@/contexts/AuthContext";
import { ProfileHeader } from "@/components/profile/ProfileHeader";
import { ProfileForm } from "@/components/profile/ProfileForm";
import { SubscriptionManager } from "@/components/profile/SubscriptionManager";

const Profile = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const { profile, updateProfile: updateProfileContext } = useProfile();
  const [formData, setFormData] = useState({
    fullName: "",
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
      setFormData({
        fullName: profile.full_name || "",
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
    if (!user?.id) {
      console.error('Profile page - Cannot update profile: No user ID');
      toast({
        title: "Error",
        description: "Unable to update profile: User not found",
        variant: "destructive",
      });
      return;
    }
    
    console.log('Profile page - Updating profile with:', updates);
    try {
      await updateProfileContext(updates);
      toast({
        title: "Success",
        description: "Profile updated successfully.",
      });
    } catch (error) {
      console.error('Profile page - Update failed:', error);
      toast({
        title: "Error",
        description: "Failed to update profile.",
        variant: "destructive",
      });
    }
  };

  if (!profile || !user) {
    return null;
  }

  return (
    <div className="container mx-auto px-4 md:px-8 py-8 pt-[15vh] md:pt-8 max-w-full md:max-w-[70%]">
      <h1 className="text-3xl font-bold text-center">Profile</h1>
      
      <div className="grid gap-8">
        <ProfileHeader 
          userId={user.id}
          avatarUrl={profile.avatar_url}
        />
        
        <ProfileForm
          email={user.email || ""}
          initialData={formData}
          onSubmit={handleProfileUpdate}
        />

        <SubscriptionManager userId={user.id} />

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
