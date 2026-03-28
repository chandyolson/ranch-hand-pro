import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOperation } from "@/contexts/OperationContext";
import type { BuyerDirectoryEntry } from "@/types/sale-barn";

export function useBuyerDirectory() {
  const { operationId } = useOperation();
  return useQuery({
    queryKey: ["buyer_directory", operationId],
    enabled: !!operationId,
    queryFn: async () => {
      const { data, error, count } = await supabase
        .from("buyer_directory")
        .select("*", { count: "exact" })
        .eq("operation_id", operationId)
        .order("buyer_num", { ascending: true });
      if (error) throw error;
      return { data: (data ?? []) as unknown as BuyerDirectoryEntry[], count };
    },
  });
}
