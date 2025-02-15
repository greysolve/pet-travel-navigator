
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export const SiteManagerView = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Site Manager Account</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-4">
          You have full access to all features as a site manager.
        </p>
        <div className="space-y-4">
          <div className="text-sm">
            <p className="font-medium mb-2">Features include:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Unlimited searches</li>
              <li>Access to all premium features</li>
              <li>Site administration tools</li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
