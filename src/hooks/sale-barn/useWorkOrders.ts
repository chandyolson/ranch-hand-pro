import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { WorkOrder } from "@/types/sale-barn";

export function useWorkOrders(saleDayId: string | undefined) {
  return useQuery({
    queryKey: ["work_orders", saleDayId],
    enabled: !!saleDayId,
    queryFn: async () => {
      const { data, error, count } = await supabase
        .from("work_orders" as any)
        .select("*", { count: "exact" })
        .eq("sale_day_id", saleDayId!)
        .order("entity_type", { ascending: true })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return { data: (data ?? []) as unknown as WorkOrder[], count };
    },
  });
}
