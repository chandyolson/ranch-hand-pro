import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOperation } from "@/contexts/OperationContext";
import type { SaleBarnPrice } from "@/types/sale-barn";

export function useSaleBarnPrices() {
  const { operationId } = useOperation();
  return useQuery({
    queryKey: ["sale_barn_prices", operationId],
    enabled: !!operationId,
    queryFn: async () => {
      const { data, error, count } = await supabase
        .from("sale_barn_prices" as any)
        .select("*", { count: "exact" })
        .eq("operation_id", operationId);
      if (error) throw error;
      return { data: (data ?? []) as unknown as SaleBarnPrice[], count };
    },
  });
}
