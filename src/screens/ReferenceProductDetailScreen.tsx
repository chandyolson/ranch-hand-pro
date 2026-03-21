import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOperation } from "@/contexts/OperationContext";
import { Skeleton } from "@/components/ui/skeleton";

const CATEGORY_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  vaccine: { label: "Vaccine", color: "#55BAAA", bg: "rgba(85,186,170,0.25)" },
  injectable: { label: "Injectable", color: "#F5C4B3", bg: "rgba(232,116,97,0.25)" },
  parasiticide: { label: "Parasiticide", color: "#AFA9EC", bg: "rgba(168,168,240,0.25)" },
  reproductive: { label: "Reproductive", color: "#E8A0BF", bg: "rgba(232,160,191,0.25)" },
  supply: { label: "Supply", color: "#BA7517", bg: "rgba(186,117,23,0.20)" },
  service: { label: "Service", color: "#B4B2A9", bg: "rgba(136,135,128,0.20)" },
  diagnostic: { label: "Diagnostic", color: "#85B7EB", bg: "rgba(91,141,239,0.20)" },
  other: { label: "Other", color: "#B4B2A9", bg: "rgba(136,135,128,0.20)" },
};

const fmtDate = (d: string) => new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

export default function ReferenceProductDetailScreen() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { operationId } = useOperation();

  const { data: product, isLoading } = useQuery({
    queryKey: ["product-detail", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*, manufacturer:manufacturers(name)")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: sizes } = useQuery({
    queryKey: ["product-sizes", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_sizes")
        .select("*")
        .eq("product_id", id!)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!id,
  });

  // Usage count — treatments this year
  const { data: usageCount } = useQuery({
    queryKey: ["product-usage-count", id, operationId],
    queryFn: async () => {
      const year = new Date().getFullYear();
      const { count }: any = await (supabase.from("treatment_products") as any)
        .select("id", { count: "exact", head: true })
        .eq("product_id", id!)
        .eq("operation_id", operationId)
        .gte("created_at", `${year}-01-01`);
      return count || 0;
    },
    enabled: !!id,
  });

  // Project usage count
  const { data: projectUsageCount } = useQuery({
    queryKey: ["product-project-count", id, operationId],
    queryFn: async () => {
      const { count } = await (supabase.from("project_products") as any)
        .select("id", { count: "exact", head: true })
        .eq("product_id", id!)
        .eq("operation_id", operationId);
      return count || 0;
    },
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="px-4 pt-4 pb-10 space-y-3">
        <Skeleton className="h-[140px] rounded-xl" style={{ backgroundColor: "rgba(14,38,70,0.10)" }} />
        <Skeleton className="h-[80px] rounded-xl" style={{ backgroundColor: "rgba(14,38,70,0.10)" }} />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="px-4 pt-4 pb-10 text-center" style={{ paddingTop: 48 }}>
        <p style={{ fontSize: 15, fontWeight: 600, color: "rgba(26,26,26,0.40)" }}>Product not found</p>
        <button onClick={() => navigate("/reference/treatments")} className="mt-3 rounded-full px-5 py-2 cursor-pointer" style={{ backgroundColor: "#0E2646", color: "white", fontSize: 13, fontWeight: 600, border: "none" }}>Back to Products</button>
      </div>
    );
  }

  const catKey = (product.product_type || "other").toLowerCase();
  const cat = CATEGORY_CONFIG[catKey] || CATEGORY_CONFIG.other;
  const mfr = (product as any).manufacturer?.name || "";

  return (
    <div className="px-4 pt-1 pb-10 space-y-0">

      {/* ═══ GRADIENT HEADER ═══ */}
      <div style={{ borderRadius: 14, padding: "16px", marginTop: 6, background: "linear-gradient(145deg, #0E2646 0%, #163A5E 55%, #55BAAA 100%)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: 22, fontWeight: 700, color: "#FFFFFF" }}>{product.name}</span>
          <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 10px", borderRadius: 10, background: cat.bg, color: cat.color }}>{cat.label.toUpperCase()}</span>
        </div>
        <div style={{ fontSize: 12, color: "rgba(240,240,240,0.5)", marginTop: 4 }}>
          {[mfr, product.nonprop_name].filter(Boolean).join(" · ")}
        </div>
        {product.description && (
          <div style={{ fontSize: 13, color: "rgba(240,240,240,0.4)", marginTop: 8, lineHeight: 1.5, fontStyle: "italic" }}>{product.description}</div>
        )}
        {product.product_info && !product.description && (
          <div style={{ fontSize: 13, color: "rgba(240,240,240,0.4)", marginTop: 8, lineHeight: 1.5, fontStyle: "italic" }}>{product.product_info}</div>
        )}
        <div style={{ display: "flex", gap: 4, marginTop: 8, flexWrap: "wrap" as const }}>
          {product.route && <span style={{ fontSize: 10, fontWeight: 600, padding: "3px 10px", borderRadius: 8, background: "rgba(255,255,255,0.1)", color: "#A8E6DA" }}>{product.route}</span>}
          {product.dosage && <span style={{ fontSize: 10, fontWeight: 600, padding: "3px 10px", borderRadius: 8, background: "rgba(255,255,255,0.1)", color: "#A8E6DA" }}>{product.dosage}</span>}
          {product.slaughter_withdrawal && (
            <span style={{ fontSize: 10, fontWeight: 600, padding: "3px 10px", borderRadius: 8, background: "rgba(243,209,42,0.2)", color: "#F3D12A" }}>{product.slaughter_withdrawal}d meat withdrawal</span>
          )}
          {product.milk_withdrawal && product.milk_withdrawal !== "0" && (
            <span style={{ fontSize: 10, fontWeight: 600, padding: "3px 10px", borderRadius: 8, background: "rgba(243,209,42,0.2)", color: "#F3D12A" }}>{product.milk_withdrawal}d milk withdrawal</span>
          )}
        </div>
      </div>

      {/* ═══ INFO GRID ═══ */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 12px", marginTop: 10 }}>
        {([
          ["Route", product.route || "—"],
          ["Injection Site", product.injection_site || "—"],
          ["Dosage", product.dosage || "—"],
          ["Species", (product.species_approvals || []).join(", ") || "—"],
          ["Storage", product.storage_requirements || "—"],
          ["NDC", product.ndc || "—"],
          ["Unit of Measure", product.unit_of_measure || "—"],
          ["Subcategory", product.subcategory || "—"],
        ] as [string, string][]).filter(([, v]) => v !== "—").map(([label, value]) => (
          <div key={label}>
            <div style={{ fontSize: 10, fontWeight: 600, color: "rgba(26,26,26,0.35)", textTransform: "uppercase" as const, letterSpacing: "0.05em" }}>{label}</div>
            <div style={{ fontSize: 13, fontWeight: 500, color: "#1A1A1A", marginTop: 1 }}>{value}</div>
          </div>
        ))}
      </div>

      {/* ═══ SIZES ═══ */}
      {sizes && sizes.length > 0 && (
        <>
          <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.08em", color: "rgba(26,26,26,0.3)", textTransform: "uppercase" as const, marginTop: 14, marginBottom: 6 }}>Available sizes</div>
          {sizes.map((s: any) => (
            <div key={s.id} style={{ background: "rgba(26,26,26,0.03)", border: "1px solid rgba(26,26,26,0.06)", borderRadius: 8, padding: "10px 12px", marginBottom: 6 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: "#0E2646" }}>{s.size_label}</span>
                  {s.is_default && <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 8, background: "rgba(85,186,170,0.12)", color: "#0F6E56" }}>DEFAULT</span>}
                </div>
                {s.cost_per_dose != null && (
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#0E2646" }}>${Number(s.cost_per_dose).toFixed(2)}/dose</span>
                )}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 4, fontSize: 12, color: "rgba(26,26,26,0.5)" }}>
                {s.unit_cost != null && <><span style={{ fontWeight: 600, color: "#1A1A1A" }}>${Number(s.unit_cost).toFixed(2)}</span> per unit</>}
                {s.doses_per_unit != null && <><span style={{ margin: "0 4px", color: "rgba(26,26,26,0.2)" }}>·</span>{s.doses_per_unit} doses</>}
              </div>
            </div>
          ))}
        </>
      )}

      {/* ═══ USAGE HISTORY ═══ */}
      <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.08em", color: "rgba(26,26,26,0.3)", textTransform: "uppercase" as const, marginTop: 14, marginBottom: 6 }}>Usage</div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 0", borderBottom: "1px solid rgba(26,26,26,0.06)" }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: "#1A1A1A", minWidth: 60 }}>{usageCount ?? "—"} times</span>
        <span style={{ fontSize: 11, color: "rgba(26,26,26,0.45)" }}>used in treatments this year</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 0" }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: "#1A1A1A", minWidth: 60 }}>{projectUsageCount ?? "—"} projects</span>
        <span style={{ fontSize: 11, color: "rgba(26,26,26,0.45)" }}>included this product</span>
      </div>

      {/* ═══ ALIASES ═══ */}
      {product.aliases && product.aliases.length > 0 && (
        <>
          <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.08em", color: "rgba(26,26,26,0.3)", textTransform: "uppercase" as const, marginTop: 14, marginBottom: 6 }}>Also known as</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" as const }}>
            {product.aliases.map((a: string, i: number) => (
              <span key={i} style={{ fontSize: 11, fontWeight: 500, padding: "3px 10px", borderRadius: 8, background: "rgba(26,26,26,0.04)", color: "rgba(26,26,26,0.55)" }}>{a}</span>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
