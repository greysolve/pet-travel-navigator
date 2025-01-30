import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/components/ui/use-toast";

const Profile = () => {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState(profile?.full_name || "");

  useEffect(() => {
    if (!loading && !user) {
      navigate("/");
    }
  }, [user, loading, navigate]);

  const handleUpdateProfile = async () => {
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ full_name: fullName })
        .eq("user_id", user?.id);

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

  if (loading) return <div>Loading...</div>;
  if (!user) return null;

  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <Input value={user.email} disabled />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Full Name</label>
            <Input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Enter your full name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Role</label>
            <Input value={profile?.role || "pet_lover"} disabled />
          </div>
          <Button onClick={handleUpdateProfile}>Update Profile</Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default Profile;