import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ProfileAvatar } from "@/components/profile/ProfileAvatar";
import { ContactInformation } from "@/components/profile/ContactInformation";
import { AddressInformation } from "@/components/profile/AddressInformation";
import { useProfileData } from "@/hooks/useProfileData";
import { useQueryClient } from "@tanstack/react-query";

const Profile = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const { profile, isLoading, updateProfile } = useProfileData(user?.id || "");
  
  // Form state
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [addressLine1, setAddressLine1] = useState("");
  const [addressLine2, setAddressLine2] = useState("");
  const [addressLine3, setAddressLine3] = useState("");
  const [locality, setLocality] = useState("");
  const [administrativeArea, setAdministrativeArea] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [selectedCountryId, setSelectedCountryId] = useState("");

  // Initialize form data from profile
  useEffect(() => {
    if (profile) {
      console.log("Initializing form with profile data:", profile);
      if (profile.full_name) {
        const nameParts = profile.full_name.split(" ");
        setFirstName(nameParts[0] || "");
        setLastName(nameParts.slice(1).join(" ") || "");
      }
      setAddressLine1(profile.address_line1 || "");
      setAddressLine2(profile.address_line2 || "");
      setAddressLine3(profile.address_line3 || "");
      setLocality(profile.locality || "");
      setAdministrativeArea(profile.administrative_area || "");
      setPostalCode(profile.postal_code || "");
      setSelectedCountryId(profile.country_id || "");
    }
  }, [profile]);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/");
    }
  }, [user, loading, navigate]);

  const handleUpdateProfile = async () => {
    if (!user) return;

    const fullName = `${firstName} ${lastName}`.trim();
    await updateProfile.mutateAsync({
      full_name: fullName,
      address_line1: addressLine1,
      address_line2: addressLine2,
      address_line3: addressLine3,
      locality: locality,
      administrative_area: administrativeArea,
      postal_code: postalCode,
      country_id: selectedCountryId || null,
    });
  };

  if (loading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div>Loading...</div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="container max-w-2xl mx-auto py-8 px-4">
      <Card className="shadow-md">
        <CardHeader className="pb-6 border-b">
          <CardTitle className="text-2xl font-semibold text-primary">Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-8 pt-6">
          <div className="flex justify-center">
            <ProfileAvatar 
              userId={user.id}
              avatarUrl={profile?.avatar_url}
              onAvatarUpdate={async () => {
                await queryClient.invalidateQueries({ queryKey: ["profile", user.id] });
              }}
            />
          </div>

          <div className="space-y-8">
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
          </div>
          
          <div className="flex justify-end pt-4 border-t">
            <Button 
              onClick={handleUpdateProfile}
              disabled={updateProfile.isPending}
              className="px-6"
            >
              {updateProfile.isPending ? "Updating..." : "Update Profile"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Profile;