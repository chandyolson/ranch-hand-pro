import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOperation } from "@/contexts/OperationContext";
import { useGroups } from "@/hooks/useGroups";
import { useLocations } from "@/hooks/useLocations";
import { useChuteSideToast } from "../components/ToastContext";
import FormFieldRow from "../components/FormFieldRow";
import { INPUT_CLS, SUB_LABEL } from "@/lib/styles";

const cattleTypeOptions = ["Cow", "Heifer", "Bull", "Steer", "Calf", "Mixed"];

export default function CowWorkNewProjectScreen() {
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [processingType, setProcessingType] = useState("");
  const [group, setGroup] = useState("");
  const [cattleType, setCattleType] = useState("");
  const [location, setLocation] = useState("");
  const [memo, setMemo] = useState("");
  const [productsOpen, setProductsOpen] = useState(false);
  const [templateOpen, setTemplateOpen] = useState(false);
  const [products, setProducts] = useState<{ id: string; name: string; dosage: string; route: string }[]>([]);
  const [productPickerOpen, setProductPickerOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const { showToast } = useChuteSideToast();
  const navigate = useNavigate();
  const { operationId } = useOperation();
  const queryClient = useQueryClient();

  const { data: groups } = useGroups();
  const { data: locations } = useLocations();
  const { data: workTypes } = useQuery({
    queryKey: ["work-types"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("work_types")
        .select("*")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: opProducts } = useQuery({
    queryKey: ["operation-products", operationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("operation_products")
        .select("*, product:products(id, name, dosage, route)")
        .eq("operation_id", operationId);
      if (error) throw error;
      return data;
    },
  });

  const { data: templates } = useQuery({
    queryKey: ["project-templates", operationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_templates")
        .select("*, work_type:work_types(code, name)")
        .eq("operation_id", operationId);
      if (error) throw error;
      return data;
    },
  });

  const handleSave = async (startWorking: boolean) => {
    if (!processingType) { showToast("error", "Processing type is required"); return; }
    setSaving(true);
    try {
      const wt = (workTypes || []).find(w => w.id === processingType);
      const grp = (groups || []).find(g => g.id === group);
      const projectName = [wt?.name, grp?.name].filter(Boolean).join(" - ") || "New Project";
      const displayId = [
        new Date(date).toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" }).replace(/\//g, ""),
        grp?.name?.substring(0, 20) || "",
        wt?.code || "",
      ].filter(Boolean).join("-");

      const { data: project, error } = await supabase
        .from("projects")
        .insert({
          operation_id: operationId,
          name: projectName,
          project_id_display: displayId,
          date,
          project_status: "Pending",
          head_count: null,
          group_id: group || null,
          location_id: location || null,
          description: memo.trim() || null,
          record_individual_animals: true,
        })
        .select()
        .single();
      if (error) throw error;

      if (processingType) {
        await supabase.from("project_work_types").insert({
          project_id: project.id,
          work_type_id: processingType,
          is_primary: true,
        });
      }

      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["project-counts"] });
      showToast("success", projectName + " created");

      if (startWorking) {
        navigate("/cow-work/" + project.id);
      } else {
        navigate("/cow-work");
      }
    } catch (err: any) {
      showToast("error", err.message || "Failed to create project");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="px-4 pt-4 pb-10 space-y-3">
      {/* Section label */}
      <div style={SUB_LABEL}>PROJECT SETUP</div>

      {/* Form card */}
      <div className="rounded-xl bg-white px-3 py-3.5 space-y-2" style={{ border: "1px solid rgba(212,212,208,0.60)" }}>
        <FormFieldRow label="Date">
          <input type="date" value={date} onChange={e => setDate(e.target.value)} className={INPUT_CLS} />
        </FormFieldRow>

        <FormFieldRow label="Type" required>
          <select value={processingType} onChange={e => setProcessingType(e.target.value)} className={INPUT_CLS}>
            <option value="" disabled>Select type</option>
            {(workTypes || []).map(wt => (
              <option key={wt.id} value={wt.id}>{wt.code} — {wt.name}</option>
            ))}
          </select>
        </FormFieldRow>

        <FormFieldRow label="Group">
          <select value={group} onChange={e => setGroup(e.target.value)} className={INPUT_CLS}>
            <option value="" disabled>Select group</option>
            {(groups || []).map(g => (
              <option key={g.id} value={g.id}>{g.name}</option>
            ))}
          </select>
        </FormFieldRow>

        <FormFieldRow label="Cattle Type">
          <select value={cattleType} onChange={e => setCattleType(e.target.value)} className={INPUT_CLS}>
            <option value="" disabled>Optional</option>
            {cattleTypeOptions.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        </FormFieldRow>

        <FormFieldRow label="Location">
          <select value={location} onChange={e => setLocation(e.target.value)} className={INPUT_CLS}>
            <option value="" disabled>Optional</option>
            {(locations || []).map(l => (
              <option key={l.id} value={l.id}>{l.name}</option>
            ))}
          </select>
        </FormFieldRow>

        {/* Memo */}
        <div className="pt-2">
          <div style={{ ...SUB_LABEL, marginBottom: 6 }}>MEMO</div>
          <textarea
            value={memo}
            onChange={e => setMemo(e.target.value)}
            className="w-full resize-none rounded-lg px-3 py-2.5 outline-none transition-all focus:border-[#F3D12A] focus:ring-2 focus:ring-[#F3D12A]/25"
            style={{ minHeight: 56, backgroundColor: "#F5F5F0", border: "1px solid #D4D4D0", fontSize: 16 }}
          />
        </div>
      </div>

      {/* Products Given collapsible */}
      <div className="rounded-xl bg-white overflow-hidden" style={{ border: "1px solid rgba(212,212,208,0.60)" }}>
        <button
          className="flex items-center justify-between w-full px-3 py-3.5 cursor-pointer active:scale-[0.99]"
          onClick={() => setProductsOpen(!productsOpen)}
        >
          <span style={{ fontSize: 15, fontWeight: 600, color: "#1A1A1A" }}>Products Given</span>
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none"
            style={{ transform: productsOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 200ms" }}>
            <path d="M4.5 6.75L9 11.25L13.5 6.75" stroke="rgba(26,26,26,0.40)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        {productsOpen && (
          <div className="px-3 pb-3" style={{ borderTop: "1px solid rgba(212,212,208,0.40)" }}>
            {products.length === 0 ? (
              <div className="text-center py-3" style={{ fontSize: 13, color: "rgba(26,26,26,0.40)" }}>No products added</div>
            ) : (
              products.map((p, i) => (
                <div key={p.id} className="flex items-center gap-2 py-2" style={{ borderBottom: "1px solid rgba(26,26,26,0.06)" }}>
                  <span className="flex-1 min-w-0 truncate" style={{ fontSize: 14, fontWeight: 600, color: "#1A1A1A" }}>{p.name}</span>
                  <span className="shrink-0" style={{ fontSize: 13, color: "rgba(26,26,26,0.50)" }}>{[p.dosage, p.route].filter(Boolean).join(" · ")}</span>
                  <button
                    className="cursor-pointer active:scale-[0.97] shrink-0"
                    style={{ fontSize: 16, color: "rgba(26,26,26,0.30)", background: "none", border: "none", padding: "0 4px" }}
                    onClick={() => setProducts(prev => prev.filter((_, idx) => idx !== i))}
                  >×</button>
                </div>
              ))
            )}

            {/* Product picker toggle */}
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
                <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.08em", color: "rgba(26,26,26,0.35)", textTransform: "uppercase" }}>SELECT PRODUCT</div>
                {(opProducts || []).length === 0 ? (
                  <div style={{ fontSize: 13, color: "rgba(26,26,26,0.40)", padding: "8px 0" }}>
                    No products configured. Add products in Reference &gt; Treatments.
                  </div>
                ) : (
                  <div className="max-h-48 overflow-y-auto space-y-0 rounded-lg" style={{ border: "1px solid #D4D4D0" }}>
                    {(opProducts || []).map(op => {
                      const prod = op.product as any;
                      if (!prod) return null;
                      const alreadyAdded = products.some(p => p.id === prod.id);
                      return (
                        <button
                          key={op.id}
                          className="flex items-center justify-between w-full px-3 py-2.5 cursor-pointer active:bg-[rgba(26,26,26,0.03)]"
                          style={{
                            background: alreadyAdded ? "rgba(85,186,170,0.06)" : "white",
                            border: "none",
                            borderBottom: "1px solid rgba(26,26,26,0.06)",
                            opacity: alreadyAdded ? 0.5 : 1,
                          }}
                          disabled={alreadyAdded}
                          onClick={() => {
                            setProducts(prev => [...prev, {
                              id: prod.id,
                              name: prod.name,
                              dosage: op.custom_dosage || prod.dosage || "",
                              route: prod.route || "",
                            }]);
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

      {/* Load from Template collapsible */}
      <div className="rounded-xl bg-white overflow-hidden" style={{ border: "1px solid rgba(212,212,208,0.60)" }}>
        <button
          className="flex items-center justify-between w-full px-3 py-3.5 cursor-pointer active:scale-[0.99]"
          onClick={() => setTemplateOpen(!templateOpen)}
        >
          <span style={{ fontSize: 15, fontWeight: 600, color: "#1A1A1A" }}>Load from Template</span>
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none"
            style={{ transform: templateOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 200ms" }}>
            <path d="M4.5 6.75L9 11.25L13.5 6.75" stroke="rgba(26,26,26,0.40)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        {templateOpen && (
          <div className="px-3 pb-2" style={{ borderTop: "1px solid rgba(212,212,208,0.40)" }}>
            {(templates || []).length === 0 ? (
              <div className="text-center py-3" style={{ fontSize: 13, color: "rgba(26,26,26,0.40)" }}>No templates</div>
            ) : (
              (templates || []).map(t => (
                <button
                  key={t.id}
                  className="flex items-center justify-between w-full py-2.5 cursor-pointer active:bg-[rgba(26,26,26,0.02)]"
                  style={{ borderBottom: "1px solid rgba(26,26,26,0.06)", background: "none", border: "none", borderBottomStyle: "solid", borderBottomWidth: 1, borderBottomColor: "rgba(26,26,26,0.06)" }}
                  onClick={() => {
                    if (t.work_type_id) setProcessingType(t.work_type_id);
                    setTemplateOpen(false);
                    showToast("success", "Template loaded");
                  }}
                >
                  <span style={{ fontSize: 14, fontWeight: 600, color: "#1A1A1A" }}>{t.name}</span>
                  <span
                    className="rounded-full"
                    style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.06em", padding: "2px 8px", backgroundColor: "rgba(243,209,42,0.15)", color: "#F3D12A" }}
                  >
                    {(t.work_type as any)?.code || ""}
                  </span>
                </button>
              ))
            )}
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex gap-3">
        <button
          className="flex-1 rounded-full py-3.5 border border-[#D4D4D0] bg-white cursor-pointer active:scale-[0.97]"
          style={{ fontSize: 14, fontWeight: 600, color: "#0E2646", opacity: saving ? 0.5 : 1 }}
          disabled={saving}
          onClick={() => handleSave(false)}
        >
          {saving ? "Saving..." : "Save"}
        </button>
        <button
          className="flex-1 rounded-full py-3.5 bg-[#F3D12A] cursor-pointer active:scale-[0.97]"
          style={{ fontSize: 14, fontWeight: 700, color: "#1A1A1A", border: "none", opacity: saving ? 0.5 : 1 }}
          disabled={saving}
          onClick={() => handleSave(true)}
        >
          {saving ? "Saving..." : "Save & Work Cows"}
        </button>
      </div>
    </div>
  );
}
