import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOperation } from "@/contexts/OperationContext";
import type { SaleBarnCustomer } from "@/types/sale-barn";

export function useSaleBarnCustomers(search: string = "", page: number = 0) {
  const { operationId } = useOperation();
  const pageSize = 50;
  return useQuery({
    queryKey: ["sale_barn_customers", operationId, search, page],
    enabled: !!operationId,
    queryFn: async () => {
      let query = supabase
        .from("sale_barn_customers" as any)
        .select("*", { count: "exact" })
        .eq("operation_id", operationId);
      if (search) {
        query = query.ilike("name", `%${search}%`);
      }
      const from = page * pageSize;
      const to = from + pageSize - 1;
      const { data, error, count } = await query
        .order("name", { ascending: true })
        .range(from, to);
      if (error) throw error;
      return { data: (data ?? []) as unknown as SaleBarnCustomer[], count };
    },
  });
}
