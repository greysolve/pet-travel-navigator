
import { Card, CardContent } from "@/components/ui/card";
import { ProfileAvatar } from "./ProfileAvatar";
import { useToast } from "@/hooks/use-toast";

interface ProfileHeaderProps {
  userId: string;
  avatarUrl?: string;
}

export const ProfileHeader = ({ userId, avatarUrl }: ProfileHeaderProps) => {
  const { toast } = useToast();

  const handleAvatarUpdate = async () => {
    toast({
      title: "Profile updated",
      description: "Your profile picture has been updated successfully.",
    });
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <ProfileAvatar 
          userId={userId}
          avatarUrl={avatarUrl}
          onAvatarUpdate={handleAvatarUpdate}
        />
      </CardContent>
    </Card>
  );
};
