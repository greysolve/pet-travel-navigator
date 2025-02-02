import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/components/ui/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User } from "lucide-react";
import { Label } from "@/components/ui/label";
import { fetchOrCreateProfile } from "@/utils/profileManagement";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";

interface Country {
  id: string;
  name: string;
  code: string;
}

const Profile = () => {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  
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

  // Optimized countries query using Supabase's SQL-to-REST features
  const { data: countries = [] } = useQuery<Country[]>({
    queryKey: ['countries'],
    queryFn: async () => {
      console.log('Fetching countries...');
      const { data, error } = await supabase
        .from('countries')
        .select('id, name, code')
        .order('name');
      
      if (error) {
        console.error('Error fetching countries:', error);
        throw error;
      }
      console.log('Countries fetched:', data);
      return data;
    },
  });

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
      const updatedProfile = await fetchOrCreateProfile(user.id);
      // Force a re-render by updating the URL
      const currentPath = window.location.pathname;
      navigate(currentPath + '?refresh=' + new Date().getTime());
    }
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);
      
      if (!event.target.files || event.target.files.length === 0) {
        throw new Error("You must select an image to upload.");
      }

      const file = event.target.files[0];
      const fileExt = file.name.split(".").pop();
      const filePath = `${user?.id}/${Math.random()}.${fileExt}`;

      // Upload the file to Supabase storage
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get the public URL
      const { data: { publicUrl } } = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath);

      // Update the profile with the new avatar URL
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl })
        .eq("id", user?.id);

      if (updateError) throw updateError;

      toast({
        title: "Avatar updated",
        description: "Your profile picture has been updated successfully.",
      });

      // Refresh the profile data to show the new avatar
      await refreshProfile();
    } catch (error: any) {
      console.error("Error uploading avatar:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to upload avatar.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
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
          <div className="flex flex-col items-center space-y-4">
            <Avatar className="h-24 w-24">
              <AvatarImage src={profile?.avatar_url} />
              <AvatarFallback>
                <User className="h-12 w-12" />
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col items-center space-y-2">
              <Input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarUpload}
                className="hidden"
                disabled={uploading}
              />
              <Button 
                onClick={triggerFileInput}
                disabled={uploading}
                variant="outline"
              >
                Upload Photo
              </Button>
              {uploading && <span className="text-sm text-muted-foreground">Uploading...</span>}
            </div>
          </div>

          {/* Contact Information Section */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Contact Information</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="block text-sm font-medium mb-1">First Name</Label>
                  <Input
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Enter your first name"
                  />
                </div>
                <div>
                  <Label className="block text-sm font-medium mb-1">Last Name</Label>
                  <Input
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Enter your last name"
                  />
                </div>
              </div>
              <div>
                <Label className="block text-sm font-medium mb-1">Email</Label>
                <Input value={user?.email} disabled />
              </div>
            </div>
          </div>

          {/* Address Section */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Address</h3>
            <div className="space-y-4">
              <div>
                <Label className="block text-sm font-medium mb-1">Address Line 1</Label>
                <Input
                  value={addressLine1}
                  onChange={(e) => setAddressLine1(e.target.value)}
                  placeholder="Street address"
                />
              </div>
              <div>
                <Label className="block text-sm font-medium mb-1">Address Line 2</Label>
                <Input
                  value={addressLine2}
                  onChange={(e) => setAddressLine2(e.target.value)}
                  placeholder="Apartment, suite, etc."
                />
              </div>
              <div>
                <Label className="block text-sm font-medium mb-1">Address Line 3</Label>
                <Input
                  value={addressLine3}
                  onChange={(e) => setAddressLine3(e.target.value)}
                  placeholder="Additional address information"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="block text-sm font-medium mb-1">City</Label>
                  <Input
                    value={locality}
                    onChange={(e) => setLocality(e.target.value)}
                    placeholder="City"
                  />
                </div>
                <div>
                  <Label className="block text-sm font-medium mb-1">State/Province</Label>
                  <Input
                    value={administrativeArea}
                    onChange={(e) => setAdministrativeArea(e.target.value)}
                    placeholder="State or province"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="block text-sm font-medium mb-1">Postal Code</Label>
                  <Input
                    value={postalCode}
                    onChange={(e) => setPostalCode(e.target.value)}
                    placeholder="Postal code"
                  />
                </div>
                <div>
                  <Label className="block text-sm font-medium mb-1">Country</Label>
                  <Select value={selectedCountryId} onValueChange={setSelectedCountryId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a country" />
                    </SelectTrigger>
                    <SelectContent>
                      {countries.map((country) => (
                        <SelectItem key={country.id} value={country.id}>
                          {country.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex justify-end">
            <Button onClick={handleUpdateProfile}>Update Profile</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Profile;