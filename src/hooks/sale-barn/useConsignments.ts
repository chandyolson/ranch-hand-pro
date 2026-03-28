import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOperation } from "@/contexts/OperationContext";
import type { Consignment } from "@/types/sale-barn";

export function useConsignments(saleDayId?: string, saleDayDate?: string) {
  const { operationId } = useOperation();
  return useQuery({
    queryKey: ["consignments", operationId, saleDayId, saleDayDate],
    enabled: !!operationId,
    queryFn: async () => {
      if (saleDayId) {
        // Fetch linked consignments
        const { data: linked, error: e1 } = await (supabase.from("consignments") as any)
          .select("*", { count: "exact" })
          .eq("sale_day_id", saleDayId)
          .order("created_at", { ascending: false });
        if (e1) throw e1;

        // Also fetch unlinked consignments matching by expected_sale_date
        let unlinked: any[] = [];
        if (saleDayDate) {
          const { data: dateMatched, error: e2 } = await (supabase.from("consignments") as any)
            .select("*")
            .is("sale_day_id", null)
            .eq("expected_sale_date", saleDayDate)
            .eq("operation_id", operationId)
            .order("created_at", { ascending: false });
          if (e2) throw e2;
          unlinked = dateMatched ?? [];
        }

        const linkedIds = new Set((linked ?? []).map((c: any) => c.id));
        const merged = [...(linked ?? []), ...unlinked.filter((c: any) => !linkedIds.has(c.id))];
        return { data: merged as unknown as Consignment[], count: merged.length };
      } else {
        const { data, error, count } = await (supabase.from("consignments") as any)
          .select("*", { count: "exact" })
          .eq("operation_id", operationId)
          .order("created_at", { ascending: false });
        if (error) throw error;
        return { data: (data ?? []) as unknown as Consignment[], count };
      }
    },
  });
}
