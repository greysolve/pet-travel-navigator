
import { useToast } from "@/hooks/use-toast";

export const useSearchValidation = () => {
  const { toast } = useToast();

  const validateSearch = (
    policySearch: string,
    origin: string,
    destination: string,
    date?: Date
  ) => {
    if (policySearch && (origin || destination)) {
      toast({
        title: "Please choose one search method",
        description: "You can either search by airline policy or by route, but not both at the same time.",
        variant: "destructive",
      });
      return false;
    }

    if (origin && destination && !date) {
      toast({
        title: "Please select a date",
        description: "A departure date is required to search for flights.",
        variant: "destructive",
      });
      return false;
    }

    return true;
  };

  return { validateSearch };
};
