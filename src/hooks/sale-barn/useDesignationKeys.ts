import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOperation } from "@/contexts/OperationContext";
import type { DesignationKey } from "@/types/sale-barn";

export function useDesignationKeys() {
  const { operationId } = useOperation();
  return useQuery({
    queryKey: ["designation_keys", operationId],
    queryFn: async () => {
      const { data, error, count } = await supabase
        .from("designation_keys" as any)
        .select("*", { count: "exact" })
        .eq("operation_id", operationId)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return { data: (data ?? []) as unknown as DesignationKey[], count };
    },
  });
}
