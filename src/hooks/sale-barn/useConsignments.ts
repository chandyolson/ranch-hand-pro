import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOperation } from "@/contexts/OperationContext";
import type { Consignment } from "@/types/sale-barn";

export function useConsignments(saleDayId?: string) {
  const { operationId } = useOperation();
  return useQuery({
    queryKey: ["consignments", operationId, saleDayId],
    queryFn: async () => {
      let q = (supabase.from("consignments") as any)
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false });
      if (saleDayId) {
        q = q.eq("sale_day_id", saleDayId);
      } else {
        q = q.eq("operation_id", operationId);
      }
      const { data, error, count } = await q;
      if (error) throw error;
      return { data: (data ?? []) as unknown as Consignment[], count };
    },
  });
}
