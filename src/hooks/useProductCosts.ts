// src/hooks/useProductCosts.ts
// Fetches the cheapest cost_per_dose for each product from product_sizes.
// Returns a Map<product_id, cost_per_dose> for fast lookups.
// Falls back to operation_products.custom_price if no product_sizes row exists.

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ProductCostMap {
  /** cost_per_dose keyed by product_id */
  costs: Map<string, number>;
  /** Whether data is still loading */
  isLoading: boolean;
}

/**
 * Given a list of product IDs, returns the cheapest cost_per_dose for each.
 * Priority: product_sizes (cheapest active row) → operation_products.custom_price → null.
 */
export function useProductCosts(
  productIds: string[],
  operationId: string
): ProductCostMap {
  const uniqueIds = [...new Set(productIds.filter(Boolean))];

  const { data, isLoading } = useQuery({
    queryKey: ["product-costs", ...uniqueIds.sort()],
    queryFn: async () => {
      if (uniqueIds.length === 0) return new Map<string, number>();

      // 1. Get cheapest cost_per_dose from product_sizes for each product
      const { data: sizes, error: sErr } = await supabase
        .from("product_sizes")
        .select("product_id, cost_per_dose")
        .in("product_id", uniqueIds)
        .eq("is_active", true)
        .not("cost_per_dose", "is", null)
        .order("cost_per_dose", { ascending: true });
      if (sErr) throw sErr;

      // Build map — first occurrence per product_id is cheapest (sorted asc)
      const costMap = new Map<string, number>();
      for (const row of sizes || []) {
        if (!costMap.has(row.product_id) && row.cost_per_dose != null) {
          costMap.set(row.product_id, row.cost_per_dose);
        }
      }

      // 2. For any products without a product_sizes row, try operation_products.custom_price
      const missing = uniqueIds.filter((id) => !costMap.has(id));
      if (missing.length > 0 && operationId) {
        const { data: opProducts, error: opErr } = await supabase
          .from("operation_products")
          .select("product_id, custom_price")
          .in("product_id", missing)
          .eq("operation_id", operationId)
          .not("custom_price", "is", null);
        if (!opErr) {
          for (const row of opProducts || []) {
            if (row.custom_price != null) {
              costMap.set(row.product_id, row.custom_price);
            }
          }
        }
      }

      return costMap;
    },
    enabled: uniqueIds.length > 0,
    staleTime: 5 * 60 * 1000, // 5 min — prices don't change mid-session
  });

  return {
    costs: data || new Map<string, number>(),
    isLoading,
  };
}

/**
 * Utility: calculate cost for one product × head count.
 */
export function calcProductCost(
  costPerDose: number | undefined,
  headCount: number | null
): number | null {
  if (costPerDose == null || !headCount) return null;
  return Math.round(costPerDose * headCount * 100) / 100;
}

/**
 * Format a dollar amount for display.
 */
export function formatCost(amount: number | null): string {
  if (amount == null) return "—";
  return `$${amount.toFixed(2)}`;
}
