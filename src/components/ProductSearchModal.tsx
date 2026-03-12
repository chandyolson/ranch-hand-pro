import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOperation } from "@/contexts/OperationContext";
import { COLORS } from "@/lib/constants";
import { INPUT_CLS } from "@/lib/styles";
import { Search, X, Star } from "lucide-react";

const TYPE_PILLS = ["All", "Vaccine", "Antibiotic", "Parasiticide", "Synchronization", "Supplement", "Anti-inflammatory", "Other"];

export interface SelectedProduct {
  product_id: string;
  name: string;
  route: string | null;
  dosage: string | null;
  injection_site: string | null;
  product_type: string;
}

interface ProductSearchModalProps {
  open: boolean;
  onClose: () => void;
  onSelect: (product: SelectedProduct) => void;
  excludeIds?: string[];
}

export default function ProductSearchModal({ open, onClose, onSelect, excludeIds = [] }: ProductSearchModalProps) {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("All");
  const { operationId } = useOperation();

  const { data: products } = useQuery({
    queryKey: ["global-products-modal"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, name, product_type, route, dosage, injection_site, manufacturer:manufacturers(name)")
        .eq("use_status", true)
        .order("name");
      if (error) throw error;
      return data || [];
    },
    enabled: open,
  });

  const { data: favorites } = useQuery({
    queryKey: ["op-favorites", operationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("operation_products")
        .select("product_id")
        .eq("operation_id", operationId)
        .eq("is_favorite", true);
      if (error) throw error;
      return new Set((data || []).map((d: any) => d.product_id));
    },
    enabled: open,
  });

  const favSet = favorites || new Set<string>();

  const filtered = (products || [])
    .filter((p: any) => !excludeIds.includes(p.id))
    .filter((p: any) => typeFilter === "All" || p.product_type === typeFilter)
    .filter((p: any) => !search || p.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a: any, b: any) => {
      const aFav = favSet.has(a.id) ? 0 : 1;
      const bFav = favSet.has(b.id) ? 0 : 1;
      if (aFav !== bFav) return aFav - bFav;
      return a.name.localeCompare(b.name);
    });

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" />
      <div
        className="relative w-full max-w-lg max-h-[80vh] flex flex-col rounded-t-2xl sm:rounded-2xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <span style={{ fontSize: 16, fontWeight: 700, color: COLORS.textOnLight }}>Add Product</span>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-100 active:bg-gray-200">
            <X size={20} style={{ color: COLORS.mutedText }} />
          </button>
        </div>

        {/* Search */}
        <div className="px-4 pb-2 relative">
          <Search size={16} className="absolute left-7 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: COLORS.mutedText }} />
          <input
            className={INPUT_CLS}
            style={{ paddingLeft: 36, width: "100%" }}
            placeholder="Search products…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
          />
        </div>

        {/* Type pills */}
        <div className="px-4 pb-2 flex gap-1.5 overflow-x-auto no-scrollbar">
          {TYPE_PILLS.map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className="rounded-full px-3 py-1 text-xs font-semibold whitespace-nowrap shrink-0 active:scale-95 transition-all"
              style={{
                backgroundColor: typeFilter === t ? COLORS.navy : "transparent",
                color: typeFilter === t ? "#FFFFFF" : COLORS.navy,
                border: typeFilter === t ? "none" : `1px solid ${COLORS.borderDivider}`,
              }}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Product list */}
        <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-1">
          {filtered.length === 0 && (
            <div className="py-8 text-center" style={{ fontSize: 13, color: COLORS.mutedText }}>
              No products found
            </div>
          )}
          {filtered.map((p: any) => {
            const isFav = favSet.has(p.id);
            return (
              <button
                key={p.id}
                className="w-full text-left rounded-lg px-3 py-2.5 hover:bg-gray-50 active:bg-gray-100 transition-colors flex items-center gap-3"
                style={{ minHeight: 44 }}
                onClick={() => {
                  onSelect({
                    product_id: p.id,
                    name: p.name,
                    route: p.route,
                    dosage: p.dosage,
                    injection_site: p.injection_site,
                    product_type: p.product_type,
                  });
                  onClose();
                }}
              >
                {isFav && <Star size={14} fill={COLORS.gold} stroke={COLORS.gold} className="shrink-0" />}
                <div className="flex-1 min-w-0">
                  <div className="truncate" style={{ fontSize: 14, fontWeight: 600, color: COLORS.textOnLight }}>
                    {p.name}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span
                      className="rounded-full px-2 py-0.5"
                      style={{ fontSize: 10, fontWeight: 600, backgroundColor: "rgba(14,38,70,0.08)", color: COLORS.navy }}
                    >
                      {p.product_type}
                    </span>
                    {p.route && (
                      <span style={{ fontSize: 11, color: COLORS.mutedText }}>{p.route}</span>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
