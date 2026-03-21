import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOperation } from "@/contexts/OperationContext";
import { useChuteSideToast } from "@/components/ToastContext";
import FormFieldRow from "@/components/FormFieldRow";
import { INPUT_CLS, SUB_LABEL } from "@/lib/styles";

const cattleTypeOptions = ["Cow", "Heifer", "Bull", "Steer", "Calf", "Mixed"];
const routeOptions = ["SubQ", "IM", "Oral", "Pour-On", "Intranasal", "Topical"];

interface TemplateProduct {
  product_id: string;
  product_name: string;
  dosage: string;
  route: string;
}

export default function WorkTemplateEditScreen() {
  const [searchParams] = useSearchParams();
  const editId = searchParams.get("id");
  const isEdit = !!editId;

  const { operationId } = useOperation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { showToast } = useChuteSideToast();

  const [name, setName] = useState("");
  const [workTypeId, setWorkTypeId] = useState("");
  const [cattleType, setCattleType] = useState("");
  const [products, setProducts] = useState<TemplateProduct[]>([]);
  const [productsOpen, setProductsOpen] = useState(false);
  const [productPickerOpen, setProductPickerOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const { data: workTypes } = useQuery({
    queryKey: ["work-types"],
    queryFn: async () => {
      const { data, error } = await supabase.from("work_types").select("*").order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: opProducts } = useQuery({
    queryKey: ["global-products-for-templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, name, dosage, route, product_type")
        .eq("use_status", true)
        .order("name");
      if (error) throw error;
      // Map to match the shape the rest of the component expects
      return (data || []).map(p => ({ product_id: p.id, product: p }));
    },
  });

  // Load existing template
  const { data: existing } = useQuery({
    queryKey: ["project-template", editId],
    queryFn: async () => {
      if (!editId) return null;
      const { data, error } = await supabase
        .from("project_templates")
        .select("*")
        .eq("id", editId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!editId,
  });

  useEffect(() => {
    if (existing) {
      setName(existing.name || "");
      setWorkTypeId(existing.work_type_id || "");
      setCattleType(existing.default_cattle_type || "");
      if (Array.isArray(existing.default_products)) {
        setProducts(existing.default_products as unknown as TemplateProduct[]);
      }
    }
  }, [existing]);

  const handleSave = async () => {
    if (!name.trim()) { showToast("error", "Template name is required"); return; }
    setSaving(true);
    try {
      const payload = {
        operation_id: operationId,
        name: name.trim(),
        work_type_id: workTypeId || null,
        default_cattle_type: cattleType || null,
        default_field_visibility: existing?.default_field_visibility ?? {},
        default_products: products.length > 0 ? products.map(p => ({
          product_id: p.product_id,
          product_name: p.product_name,
          dosage: p.dosage || null,
          route: p.route || null,
        })) : null,
      };

      if (isEdit) {
        const { error } = await supabase.from("project_templates").update(payload).eq("id", editId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("project_templates").insert(payload);
        if (error) throw error;
      }

      queryClient.invalidateQueries({ queryKey: ["project-templates"] });
      queryClient.invalidateQueries({ queryKey: ["project-template", editId] });
      showToast("success", isEdit ? "Template updated" : "Template created");
      navigate("/reference/templates");
    } catch (err: any) {
      showToast("error", err.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const productCount = products.length;

  return (
    <div className="px-4 pt-4 pb-10 space-y-3">
      <div style={SUB_LABEL}>{isEdit ? "EDIT TEMPLATE" : "NEW TEMPLATE"}</div>

      {/* Basic Info */}
      <div className="rounded-xl bg-white px-3 py-3.5 space-y-2" style={{ border: "1px solid rgba(212,212,208,0.60)" }}>
        <FormFieldRow label="Name" required>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Spring Preg Check"
            className={INPUT_CLS}
          />
        </FormFieldRow>

        <FormFieldRow label="Type">
          <select value={workTypeId} onChange={(e) => setWorkTypeId(e.target.value)} className={INPUT_CLS}>
            <option value="">Optional</option>
            {(workTypes || []).map((wt) => (
              <option key={wt.id} value={wt.id}>{wt.code} — {wt.name}</option>
            ))}
          </select>
        </FormFieldRow>

        <FormFieldRow label="Cattle Type">
          <select value={cattleType} onChange={(e) => setCattleType(e.target.value)} className={INPUT_CLS}>
            <option value="">Optional</option>
            {cattleTypeOptions.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
        </FormFieldRow>
      </div>

      {/* Default Products — collapsible */}
      <div className="rounded-xl bg-white overflow-hidden" style={{ border: "1px solid rgba(212,212,208,0.60)" }}>
        <button
          className="flex items-center justify-between w-full px-3 py-3.5 cursor-pointer active:scale-[0.99]"
          onClick={() => setProductsOpen(!productsOpen)}
        >
          <span style={{ fontSize: 15, fontWeight: 600, color: "#1A1A1A" }}>Default Products</span>
          <div className="flex items-center gap-2">
            <span style={{ fontSize: 12, color: "rgba(26,26,26,0.40)" }}>
              {productCount > 0 ? `${productCount} product${productCount !== 1 ? "s" : ""}` : "No default products"}
            </span>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none"
              style={{ transform: productsOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 200ms" }}>
              <path d="M4.5 6.75L9 11.25L13.5 6.75" stroke="rgba(26,26,26,0.40)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </button>

        {productsOpen && (
          <div className="px-3 pb-3" style={{ borderTop: "1px solid rgba(212,212,208,0.40)" }}>
            {products.length === 0 ? (
              <div className="text-center py-3" style={{ fontSize: 13, color: "rgba(26,26,26,0.40)" }}>
                No default products. Products added here will auto-fill when this template is used.
              </div>
            ) : (
              products.map((p, i) => (
                <div key={`${p.product_id}-${i}`} className="py-2 space-y-1.5" style={{ borderBottom: "1px solid rgba(26,26,26,0.06)" }}>
                  <div className="flex items-center gap-2">
                    <span className="flex-1 min-w-0 truncate" style={{ fontSize: 14, fontWeight: 600, color: "#1A1A1A" }}>
                      {p.product_name}
                    </span>
                    <button
                      className="cursor-pointer active:scale-[0.97] shrink-0"
                      style={{ fontSize: 16, color: "rgba(26,26,26,0.30)", background: "none", border: "none", padding: "0 4px" }}
                      onClick={() => setProducts((prev) => prev.filter((_, idx) => idx !== i))}
                    >
                      ×
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={p.dosage}
                      onChange={(e) => {
                        const val = e.target.value;
                        setProducts((prev) => prev.map((item, idx) => idx === i ? { ...item, dosage: val } : item));
                      }}
                      placeholder="Dosage"
                      className="flex-1 h-9 min-w-0 rounded-lg border border-[#D4D4D0] bg-white px-3 outline-none transition-all focus:border-[#F3D12A] focus:ring-2 focus:ring-[#F3D12A]/25"
                      style={{ fontSize: 16 }}
                    />
                    <select
                      value={p.route}
                      onChange={(e) => {
                        const val = e.target.value;
                        setProducts((prev) => prev.map((item, idx) => idx === i ? { ...item, route: val } : item));
                      }}
                      className="h-9 rounded-lg border border-[#D4D4D0] bg-white px-2 outline-none transition-all focus:border-[#F3D12A] focus:ring-2 focus:ring-[#F3D12A]/25"
                      style={{ fontSize: 16, minWidth: 90 }}
                    >
                      <option value="">Route</option>
                      {routeOptions.map((r) => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>
                </div>
              ))
            )}

            {/* Product picker */}
            {!productPickerOpen ? (
              <button
                className="mt-2 rounded-full px-4 py-2 border border-[#D4D4D0] bg-white cursor-pointer active:scale-[0.97]"
                style={{ fontSize: 13, fontWeight: 600, color: "#0E2646" }}
                onClick={() => setProductPickerOpen(true)}
              >
                + Add Product
              </button>
            ) : (
              <div className="mt-2 space-y-1.5">
                <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.08em", color: "rgba(26,26,26,0.35)", textTransform: "uppercase" }}>
                  SELECT PRODUCT
                </div>
                {(opProducts || []).length === 0 ? (
                  <div style={{ fontSize: 13, color: "rgba(26,26,26,0.40)", padding: "8px 0" }}>
                    No products configured. Add products in Reference &gt; Treatments.
                  </div>
                ) : (
                  <div className="max-h-48 overflow-y-auto space-y-0 rounded-lg" style={{ border: "1px solid #D4D4D0" }}>
                    {(opProducts || []).map((op: any) => {
                      const prod = op.product as any;
                      if (!prod) return null;
                      const alreadyAdded = products.some((p) => p.product_id === prod.id);
                      return (
                        <button
                          key={op.product_id}
                          className="flex items-center justify-between w-full px-3 py-2.5 cursor-pointer active:bg-[rgba(26,26,26,0.03)]"
                          style={{
                            background: alreadyAdded ? "rgba(85,186,170,0.06)" : "white",
                            border: "none",
                            borderBottom: "1px solid rgba(26,26,26,0.06)",
                            opacity: alreadyAdded ? 0.5 : 1,
                          }}
                          disabled={alreadyAdded}
                          onClick={() => {
                            setProducts((prev) => [
                              ...prev,
                              {
                                product_id: prod.id,
                                product_name: prod.name,
                                dosage: op.custom_dosage || prod.dosage || "",
                                route: prod.route || "",
                              },
                            ]);
                          }}
                        >
                          <span className="truncate" style={{ fontSize: 14, fontWeight: 600, color: "#1A1A1A" }}>{prod.name}</span>
                          <span className="shrink-0 ml-2" style={{ fontSize: 12, color: "rgba(26,26,26,0.40)" }}>
                            {alreadyAdded ? "Added" : [op.custom_dosage || prod.dosage, prod.route].filter(Boolean).join(" · ")}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
                <button
                  className="rounded-full px-4 py-1.5 border border-[#D4D4D0] bg-white cursor-pointer active:scale-[0.97]"
                  style={{ fontSize: 12, fontWeight: 600, color: "rgba(26,26,26,0.50)" }}
                  onClick={() => setProductPickerOpen(false)}
                >
                  Done
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex gap-3">
        <button
          className="flex-1 rounded-full py-3.5 border border-[#D4D4D0] bg-white cursor-pointer active:scale-[0.97]"
          style={{ fontSize: 14, fontWeight: 600, color: "#0E2646" }}
          onClick={() => navigate("/reference/templates")}
        >
          Cancel
        </button>
        <button
          className="flex-1 rounded-full py-3.5 bg-[#F3D12A] cursor-pointer active:scale-[0.97]"
          style={{ fontSize: 14, fontWeight: 700, color: "#1A1A1A", border: "none", opacity: saving ? 0.5 : 1 }}
          disabled={saving}
          onClick={handleSave}
        >
          {saving ? "Saving..." : isEdit ? "Update Template" : "Save Template"}
        </button>
      </div>
    </div>
  );
}
