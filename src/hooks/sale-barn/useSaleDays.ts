import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOperation } from "@/contexts/OperationContext";
import type { SaleDay } from "@/types/sale-barn";

export function useSaleDays() {
  const { operationId } = useOperation();
  return useQuery({
    queryKey: ["sale_days", operationId],
    enabled: !!operationId,
    queryFn: async () => {
      const { data, error, count } = await supabase
        .from("sale_days")
        .select("*", { count: "exact" })
        .eq("operation_id", operationId)
        .order("date", { ascending: false });
      if (error) throw error;
      return { data: (data ?? []) as unknown as SaleDay[], count };
    },
  });
}
