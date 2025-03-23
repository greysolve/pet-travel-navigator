
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Toggle } from "@/components/ui/toggle";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { usePremiumFields } from "@/hooks/usePremiumFields";

type PremiumField = {
  id: string;
  field_name: string;
  is_premium: boolean;
  description: string;
};

export const PremiumFieldsManager = () => {
  const [updatingField, setUpdatingField] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: premiumFields, isLoading, refetch } = useQuery({
    queryKey: ['premiumFields'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('premium_field_settings')
        .select('*')
        .order('field_name');

      if (error) {
        console.error('Error fetching premium fields:', error);
        throw error;
      }

      return data as PremiumField[];
    },
  });

  const togglePremiumStatus = async (fieldId: string, currentStatus: boolean) => {
    setUpdatingField(fieldId);
    try {
      const { error } = await supabase
        .from('premium_field_settings')
        .update({ is_premium: !currentStatus })
        .eq('id', fieldId);

      if (error) throw error;
      
      // Invalidate both the admin view and the centralized premium fields queries
      await Promise.all([
        refetch(),
        queryClient.invalidateQueries({ queryKey: ['premiumFields'] })
      ]);
      
      // Also invalidate any queries that depend on premium fields
      await queryClient.invalidateQueries({ queryKey: ['petPolicies'] });
    } catch (error) {
      console.error('Error updating premium status:', error);
    } finally {
      setUpdatingField(null);
    }
  };

  const formatFieldName = (fieldName: string | undefined) => {
    if (!fieldName) return '';
    return fieldName
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold">Premium Fields Management</h2>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Field Name</TableHead>
            <TableHead>Description</TableHead>
            <TableHead>Premium Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {premiumFields?.map((field) => (
            <TableRow key={field.id}>
              <TableCell className="font-medium">
                {formatFieldName(field.field_name)}
              </TableCell>
              <TableCell>{field.description}</TableCell>
              <TableCell>
                <Toggle
                  pressed={field.is_premium}
                  onPressedChange={() => togglePremiumStatus(field.id, field.is_premium)}
                  disabled={updatingField === field.id}
                  className={field.is_premium ? "bg-orange-500" : ""}
                >
                  {field.is_premium ? 'Premium' : 'Free'}
                </Toggle>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
