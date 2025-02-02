import { useState, useEffect } from "react";
import { ContactInformation } from "@/components/profile/ContactInformation";
import { AddressInformation } from "@/components/profile/AddressInformation";
import { ProfileAvatar } from "@/components/profile/ProfileAvatar";
import { PetTravelWallet } from "@/components/profile/PetTravelWallet";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { useQuery } from "@tanstack/react-query";
import { UserProfile } from "@/types/auth";

const Profile = () => {
  const { toast } = useToast();
  const [userId, setUserId] = useState<string>("");

  // State for contact information
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");

  // State for address information
  const [addressLine1, setAddressLine1] = useState("");
  const [addressLine2, setAddressLine2] = useState("");
  const [addressLine3, setAddressLine3] = useState("");
  const [locality, setLocality] = useState("");
  const [administrativeArea, setAdministrativeArea] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [selectedCountryId, setSelectedCountryId] = useState("");

  // Fetch user session and profile data
  useEffect(() => {
    const fetchSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.id) {
        setUserId(session.user.id);
        setEmail(session.user.email || "");
      }
    };
    fetchSession();
  }, []);

  // Fetch profile data
  const { data: profile } = useQuery<UserProfile>({
    queryKey: ['profile', userId],
    queryFn: async () => {
      if (!userId) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;
      return data as UserProfile;
    },
    enabled: !!userId,
    onSuccess: (data) => {
      if (data) {
        // Update contact information
        const fullName = data.full_name || "";
        const [firstName = "", lastName = ""] = fullName.split(" ");
        setFirstName(firstName);
        setLastName(lastName);

        // Update address information
        setAddressLine1(data.address_line1 || "");
        setAddressLine2(data.address_line2 || "");
        setAddressLine3(data.address_line3 || "");
        setLocality(data.locality || "");
        setAdministrativeArea(data.administrative_area || "");
        setPostalCode(data.postal_code || "");
        setSelectedCountryId(data.country_id || "");
      }
    }
  });

  const handleAvatarUpdate = async () => {
    toast({
      title: "Profile updated",
      description: "Your profile picture has been updated successfully.",
    });
  };

  const updateProfile = async () => {
    if (!userId) return;

    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: `${firstName} ${lastName}`,
        address_line1: addressLine1,
        address_line2: addressLine2,
        address_line3: addressLine3,
        locality: locality,
        administrative_area: administrativeArea,
        postal_code: postalCode,
        country_id: selectedCountryId,
      })
      .eq('id', userId);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to update profile.",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Success",
      description: "Profile updated successfully.",
    });
  };

  return (
    <div className="container py-8 space-y-8">
      <h1 className="text-3xl font-bold">Profile</h1>
      
      <div className="grid gap-8">
        <ProfileAvatar 
          userId={userId}
          avatarUrl={profile?.avatar_url}
          onAvatarUpdate={handleAvatarUpdate}
        />
        
        <div className="grid gap-8 md:grid-cols-2">
          <ContactInformation
            firstName={firstName}
            lastName={lastName}
            email={email}
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

        <PetTravelWallet />
      </div>
    </div>
  );
};

export default Profile;