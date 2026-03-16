import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOperation } from "@/contexts/OperationContext";
import { useChuteSideToast } from "@/components/ToastContext";
import { Skeleton } from "@/components/ui/skeleton";

const CATEGORY_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  vaccine: { label: "Vaccine", color: "#55BAAA", bg: "rgba(85,186,170,0.12)" },
  antibiotic: { label: "Antibiotic", color: "#E87461", bg: "rgba(232,116,97,0.12)" },
  supplement: { label: "Supplement", color: "#27AE60", bg: "rgba(39,174,96,0.12)" },
  anthelmentic: { label: "Parasiticide", color: "#A8A8F0", bg: "rgba(168,168,240,0.12)" },
  "synchronization drug": { label: "Synch Drug", color: "#E8A0BF", bg: "rgba(232,160,191,0.12)" },
  "growth promotant implant": { label: "Implant", color: "#F3D12A", bg: "rgba(243,209,42,0.12)" },
  "feed additive": { label: "Feed Additive", color: "#BA7517", bg: "rgba(186,117,23,0.12)" },
  "anti-inflammatory": { label: "Anti-Inflam", color: "#5B8DEF", bg: "rgba(91,141,239,0.12)" },
  service: { label: "Service", color: "#888780", bg: "rgba(136,135,128,0.12)" },
  supply: { label: "Supply", color: "#888780", bg: "rgba(136,135,128,0.12)" },
  hormone: { label: "Hormone", color: "#A8A8F0", bg: "rgba(168,168,240,0.12)" },
  mineral: { label: "Mineral", color: "#F3D12A", bg: "rgba(243,209,42,0.12)" },
  other: { label: "Other", color: "#888780", bg: "rgba(136,135,128,0.12)" },
};

const FILTER_CATEGORIES = ["All", "Vaccine", "Antibiotic", "Supplement", "Parasiticide", "Implant", "Synch Drug", "Other"];

function getCat(productType: string | null): { key: string; label: string; color: string; bg: string } {
  const k = (productType || "other").toLowerCase();
  const cfg = CATEGORY_CONFIG[k];
  if (cfg) return { key: k, ...cfg };
  return { key: "other", ...CATEGORY_CONFIG.other };
}

export default function ReferenceTreatmentsScreen() {
  const navigate = useNavigate();
  const { operationId } = useOperation();
  const { showToast } = useChuteSideToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("All");

  // All products — global catalog
  const { data: allProducts, isLoading } = useQuery({
    queryKey: ["all-products-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*, manufacturer:manufacturers(name)")
        .eq("use_status", true)
        .order("name");
      if (error) throw error;
      return data || [];
    },
  });

  // Operation favorites
  const { data: favIds } = useQuery({
    queryKey: ["operation-favorites", operationId],
    queryFn: async () => {
      const { data } = await supabase
        .from("operation_products")
        .select("product_id")
        .eq("operation_id", operationId);
      return new Set((data || []).map((r: any) => r.product_id));
    },
  });

  const toggleFav = async (productId: string, isFav: boolean) => {
    if (isFav) {
      await supabase.from("operation_products").delete().eq("product_id", productId).eq("operation_id", operationId);
    } else {
      await supabase.from("operation_products").insert({ product_id: productId, operation_id: operationId });
    }
    queryClient.invalidateQueries({ queryKey: ["operation-favorites"] });
  };

  const mapped = useMemo(() => (allProducts || []).map(p => {
    const cat = getCat(p.product_type);
    return {
      id: p.id,
      name: p.name,
      manufacturer: (p as any).manufacturer?.name || "",
      category: cat,
      dosage: p.dosage || "",
      route: p.route || "",
      slaughterWd: p.slaughter_withdrawal || "",
      milkWd: p.milk_withdrawal || "",
      isFav: favIds?.has(p.id) || false,
    };
  }), [allProducts, favIds]);

  const filtered = mapped
    .filter(p => {
      if (catFilter !== "All") {
        if (catFilter === "Other") {
          return !["vaccine", "antibiotic", "supplement", "anthelmentic", "growth promotant implant", "synchronization drug"].includes(p.category.key);
        }
        const filterMap: Record<string, string[]> = {
          Vaccine: ["vaccine"],
          Antibiotic: ["antibiotic"],
          Supplement: ["supplement"],
          Parasiticide: ["anthelmentic"],
          Implant: ["growth promotant implant"],
          "Synch Drug": ["synchronization drug"],
        };
        const keys = filterMap[catFilter] || [];
        if (!keys.includes(p.category.key)) return false;
      }
      if (search) {
        const s = search.toLowerCase();
        return p.name.toLowerCase().includes(s) || p.manufacturer.toLowerCase().includes(s);
      }
      return true;
    })
    .sort((a, b) => {
      // Favorites first, then alphabetical
      if (a.isFav !== b.isFav) return a.isFav ? -1 : 1;
      return a.name.localeCompare(b.name);
    });

  const wdText = (p: typeof mapped[0]) => {
    const parts: string[] = [];
    if (p.slaughterWd) parts.push(p.slaughterWd + "d meat");
    if (p.milkWd && p.milkWd !== "0") parts.push(p.milkWd + "d milk");
    if (parts.length === 0 && !p.slaughterWd) return "0d withdrawal";
    return parts.join(" · ") || "0d withdrawal";
  };

  return (
    <div className="px-4 pt-1 pb-10 space-y-0">
      {/* Category filter pills */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" as const, marginTop: 6 }}>
        {FILTER_CATEGORIES.map(c => (
          <button key={c} onClick={() => setCatFilter(c)} style={{
            fontSize: 11, fontWeight: 600, padding: "5px 12px", borderRadius: 20, cursor: "pointer",
            background: catFilter === c ? "#0E2646" : "transparent",
            color: catFilter === c ? "#FFFFFF" : "rgba(26,26,26,0.5)",
            border: catFilter === c ? "none" : "1px solid #D4D4D0",
          }}>{c}</button>
        ))}
      </div>

      {/* Search */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#fff", border: "1px solid #D4D4D0", borderRadius: 10, padding: "0 12px", height: 40, marginTop: 8 }}>
        <svg width="16" height="16" viewBox="0 0 18 18" fill="none"><circle cx="8" cy="8" r="5.5" stroke="rgba(26,26,26,0.3)" strokeWidth="1.5"/><path d="M12.5 12.5L16 16" stroke="rgba(26,26,26,0.3)" strokeWidth="1.5" strokeLinecap="round"/></svg>
        <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search products..." style={{ border: "none", outline: "none", background: "transparent", fontSize: 15, color: "#1A1A1A", flex: 1 }} />
        {search && (
          <button onClick={() => setSearch("")} style={{ width: 24, height: 24, borderRadius: 12, background: "rgba(26,26,26,0.08)", border: "none", fontSize: 12, color: "rgba(26,26,26,0.5)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
        )}
      </div>

      {/* Count */}
      <div style={{ fontSize: 10, fontWeight: 600, color: "rgba(26,26,26,0.35)", marginTop: 8 }}>
        {filtered.length} product{filtered.length !== 1 ? "s" : ""}{catFilter !== "All" ? ` in ${catFilter}` : ""}
        {search ? ` matching "${search}"` : ""}
      </div>

      {/* Product list */}
      {isLoading ? (
        <div style={{ display: "flex", flexDirection: "column" as const, gap: 8, marginTop: 8 }}>
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-[72px] rounded-xl" style={{ backgroundColor: "rgba(14,38,70,0.10)" }} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: "center" as const, padding: "40px 0" }}>
          <p style={{ fontSize: 15, fontWeight: 600, color: "rgba(26,26,26,0.4)" }}>No products found</p>
          <p style={{ fontSize: 13, color: "rgba(26,26,26,0.3)", marginTop: 4 }}>Try a different search or category</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column" as const, gap: 8, marginTop: 8 }}>
          {filtered.map(p => (
            <div key={p.id} onClick={() => navigate("/reference/treatments/" + p.id)}
              style={{ background: "#fff", border: "1px solid #D4D4D0", borderRadius: 10, padding: 12, cursor: "pointer" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: 15, fontWeight: 700, color: "#0E2646" }}>{p.name}</span>
                    <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 8px", borderRadius: 10, letterSpacing: "0.04em", background: p.category.bg, color: p.category.color }}>{p.category.label.toUpperCase()}</span>
                  </div>
                  {p.manufacturer && <div style={{ fontSize: 11, color: "rgba(26,26,26,0.45)", marginTop: 2 }}>{p.manufacturer}</div>}
                </div>
                <button onClick={(e) => { e.stopPropagation(); toggleFav(p.id, p.isFav); }} style={{ width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", background: "transparent", border: "none", cursor: "pointer", flexShrink: 0 }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill={p.isFav ? "#F3D12A" : "none"} stroke={p.isFav ? "#F3D12A" : "rgba(26,26,26,0.2)"} strokeWidth="2"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                </button>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 6, flexWrap: "wrap" as const }}>
                {p.route && <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 8, background: "rgba(26,26,26,0.04)", color: "rgba(26,26,26,0.55)" }}>{p.route}</span>}
                {p.dosage && <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 8, background: "rgba(26,26,26,0.04)", color: "rgba(26,26,26,0.55)" }}>{p.dosage}</span>}
                <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 8, background: "rgba(243,209,42,0.1)", color: "#B8860B" }}>{wdText(p)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
