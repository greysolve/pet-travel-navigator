import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/components/ui/use-toast";
import { fetchOrCreateProfile } from "@/utils/profileManagement";
import { ProfileAvatar } from "@/components/profile/ProfileAvatar";
import { ContactInformation } from "@/components/profile/ContactInformation";
import { AddressInformation } from "@/components/profile/AddressInformation";

const Profile = () => {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  
  // Split name fields
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  
  // Address fields
  const [addressLine1, setAddressLine1] = useState(profile?.address_line1 || "");
  const [addressLine2, setAddressLine2] = useState(profile?.address_line2 || "");
  const [addressLine3, setAddressLine3] = useState(profile?.address_line3 || "");
  const [locality, setLocality] = useState(profile?.locality || "");
  const [administrativeArea, setAdministrativeArea] = useState(profile?.administrative_area || "");
  const [postalCode, setPostalCode] = useState(profile?.postal_code || "");
  const [selectedCountryId, setSelectedCountryId] = useState(profile?.country_id || "");

  // Split full name on component mount
  useEffect(() => {
    if (profile?.full_name) {
      const nameParts = profile.full_name.split(" ");
      setFirstName(nameParts[0] || "");
      setLastName(nameParts.slice(1).join(" ") || "");
    }
  }, [profile?.full_name]);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/");
    }
  }, [user, loading, navigate]);

  const handleUpdateProfile = async () => {
    try {
      const fullName = `${firstName} ${lastName}`.trim();
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: fullName,
          address_line1: addressLine1,
          address_line2: addressLine2,
          address_line3: addressLine3,
          locality: locality,
          administrative_area: administrativeArea,
          postal_code: postalCode,
          country_id: selectedCountryId || null,
        })
        .eq("id", user?.id);

      if (error) throw error;
      toast({
        title: "Profile updated",
        description: "Your profile has been updated successfully.",
      });
    } catch (error) {
      console.error("Error updating profile:", error);
      toast({
        title: "Error",
        description: "Failed to update profile.",
        variant: "destructive",
      });
    }
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchOrCreateProfile(user.id);
      // Force a re-render by updating the URL
      const currentPath = window.location.pathname;
      navigate(currentPath + '?refresh=' + new Date().getTime());
    }
  };

  if (loading) return <div>Loading...</div>;
  if (!user) return null;

  return (
    <div className="container mx-auto py-8 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <ProfileAvatar 
            userId={user.id}
            avatarUrl={profile?.avatar_url}
            onAvatarUpdate={refreshProfile}
          />

          <ContactInformation
            firstName={firstName}
            lastName={lastName}
            email={user.email}
            onFirstNameChange={setFirstName}
            onLastNameChange={setLastName}
          />

          <AddressInformation
            addressLine1={addressLine1}
            addressLine2={addressLine2}
            addressLine3={addressLine3}
            locality={locality}
            administrativeArea={administrativeArea}
            postalCode={postalCode}
            selectedCountryId={selectedCountryId}
            onAddressLine1Change={setAddressLine1}
            onAddressLine2Change={setAddressLine2}
            onAddressLine3Change={setAddressLine3}
            onLocalityChange={setLocality}
            onAdministrativeAreaChange={setAdministrativeArea}
            onPostalCodeChange={setPostalCode}
            onCountryChange={setSelectedCountryId}
          />
          
          <div className="flex justify-end">
            <Button onClick={handleUpdateProfile}>Update Profile</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Profile;