import { useState, useEffect } from "react";
import { ContactInformation } from "@/components/profile/ContactInformation";
import { AddressInformation } from "@/components/profile/AddressInformation";
import { ProfileAvatar } from "@/components/profile/ProfileAvatar";
import { PetTravelWallet } from "@/components/profile/PetTravelWallet";
import { PasswordChange } from "@/components/profile/PasswordChange";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { UserProfile } from "@/types/auth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import AuthDialog from "@/components/AuthDialog";

const Profile = () => {
  const { toast } = useToast();
  const [userId, setUserId] = useState<string>("");
  const [isUpdating, setIsUpdating] = useState(false);

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
  const { data: profile, refetch: refetchProfile } = useQuery<UserProfile>({
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
  });

  // Update state when profile data is loaded
  useEffect(() => {
    if (profile) {
      const fullName = profile.full_name || "";
      const [firstName = "", lastName = ""] = fullName.split(" ");
      setFirstName(firstName);
      setLastName(lastName);
      setAddressLine1(profile.address_line1 || "");
      setAddressLine2(profile.address_line2 || "");
      setAddressLine3(profile.address_line3 || "");
      setLocality(profile.locality || "");
      setAdministrativeArea(profile.administrative_area || "");
      setPostalCode(profile.postal_code || "");
      setSelectedCountryId(profile.country_id || "");
    }
  }, [profile]);

  const handleAvatarUpdate = async () => {
    toast({
      title: "Profile updated",
      description: "Your profile picture has been updated successfully.",
    });
  };

  const updateProfile = async () => {
    if (!userId) return;
    
    setIsUpdating(true);
    try {
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

      await refetchProfile();
      toast({
        title: "Success",
        description: "Profile updated successfully.",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="container max-w-[70%] mx-auto py-8">
      <h1 className="text-3xl font-bold text-center">Profile</h1>
      
      <div className="grid gap-8">
        <Card>
          <CardContent className="pt-6">
            <ProfileAvatar 
              userId={userId}
              avatarUrl={profile?.avatar_url}
              onAvatarUpdate={handleAvatarUpdate}
            />
          </CardContent>
        </Card>
        
        <div className="space-y-8">
          <Card>
            <CardContent className="pt-6">
              <ContactInformation
                firstName={firstName}
                lastName={lastName}
                email={email}
                onFirstNameChange={setFirstName}
                onLastNameChange={setLastName}
              />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
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
            </CardContent>
          </Card>

          <PasswordChange />

          <div className="flex justify-end">
            <Button 
              onClick={updateProfile} 
              disabled={isUpdating}
              className="w-32"
            >
              {isUpdating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </div>
        </div>

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
