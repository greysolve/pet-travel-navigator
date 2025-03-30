import { useAuth } from "@/contexts/auth/AuthContext";
import { useProfile } from "@/contexts/profile/ProfileContext";
import { useCurrentPlan } from "@/hooks/use-current-plan";
import { CurrentPlanCard } from "@/components/pricing/CurrentPlanCard";
import { PricingTable } from "@/components/pricing/PricingTable";
import { SiteManagerView } from "@/components/pricing/SiteManagerView";

const Pricing = () => {
  const { session } = useAuth();
  const { profile } = useProfile();
  const { data: currentPlan } = useCurrentPlan(session?.user?.id);

  // Site Manager view
  if (profile?.userRole === 'site_manager') {
    return (
      <div className="container mx-auto py-16 px-4">
        <SiteManagerView />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-16 px-4">
      {/* Current Plan Section */}
      {currentPlan && session?.user?.id && (
        <CurrentPlanCard plan={currentPlan} userId={session.user.id} />
      )}

      {/* Available Plans Section */}
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">Choose Your Plan</h1>
        <p className="text-xl text-gray-600">
          Select the perfect plan for your pet travel needs
        </p>
      </div>

      {/* Stripe Pricing Table */}
      <PricingTable userId={session?.user?.id} />
    </div>
  );
};

export default Pricing;
