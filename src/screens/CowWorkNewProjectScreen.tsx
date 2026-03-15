import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOperation } from "@/contexts/OperationContext";
import { useGroups } from "@/hooks/useGroups";
import { useLocations } from "@/hooks/useLocations";
import { useGroupMembers, useGroupMemberCount } from "@/hooks/useAnimalGroups";
import { useChuteSideToast } from "../components/ToastContext";
import FormFieldRow from "../components/FormFieldRow";
import ConfigureFieldsSection from "../components/ConfigureFieldsSection";
import LoadFromProtocolDrawer from "../components/LoadFromProtocolDrawer";
import { LABEL_STYLE, INPUT_CLS, SUB_LABEL } from "@/lib/styles";
import { getDefaultFieldConfig, type FieldVisibilityConfig } from "@/lib/field-config";

const cattleTypeOptions = ["Cow", "Heifer", "Bull", "Steer", "Calf", "Mixed"];

interface ProductRow {
  id: string;
  name: string;
  dosage: string;
  route: string;
  source?: "manual" | "template" | "protocol";
  source_ref?: string | null;
}

export default function CowWorkNewProjectScreen() {
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [processingType, setProcessingType] = useState("");
  const [group, setGroup] = useState("");
  const [cattleType, setCattleType] = useState("");
  const [location, setLocation] = useState("");
  const [memo, setMemo] = useState("");
  const [estimatedHead, setEstimatedHead] = useState<number | "">("");
  const [preloadEnabled, setPreloadEnabled] = useState(false);
  const [preloadMode, setPreloadMode] = useState<"expected" | "worked">("expected");
  const [productsOpen, setProductsOpen] = useState(false);
  const [templateOpen, setTemplateOpen] = useState(false);
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [productPickerOpen, setProductPickerOpen] = useState(false);
  const [productSearch, setProductSearch] = useState("");
  const [protocolDrawerOpen, setProtocolDrawerOpen] = useState(false);
  const [fieldConfig, setFieldConfig] = useState<FieldVisibilityConfig>(getDefaultFieldConfig());
  const [saving, setSaving] = useState(false);
  const { showToast } = useChuteSideToast();
  const navigate = useNavigate();
  const { operationId } = useOperation();
  const queryClient = useQueryClient();

  const { data: groups } = useGroups();
  const { data: locations } = useLocations();
  const { data: memberCount } = useGroupMemberCount(group || undefined);
  const { data: groupMembers } = useGroupMembers(preloadEnabled ? (group || undefined) : undefined);
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

  const { data: allProducts } = useQuery({
    queryKey: ["global-products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, name, dosage, route, product_type")
        .order("name");
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

  // Task 8: Auto-fill estimated head from group member count
  useEffect(() => {
    if (memberCount && memberCount > 0) {
      setEstimatedHead(memberCount);
    }
  }, [memberCount]);

  // Task 4: Template load handler — now includes products and field config
  const handleTemplateSelect = (t: any) => {
    if (t.work_type_id) setProcessingType(t.work_type_id);
    if (t.default_cattle_type) setCattleType(t.default_cattle_type);

    // Load template field visibility config
    if (t.default_field_visibility && typeof t.default_field_visibility === "object" && t.default_field_visibility.optionalFields) {
      setFieldConfig(t.default_field_visibility as FieldVisibilityConfig);
    }

    // Load template products (append, don't replace)
    if (Array.isArray(t.default_products) && t.default_products.length > 0) {
      const templateProducts: ProductRow[] = t.default_products.map((p: any) => ({
        id: p.product_id,
        name: p.product_name,
        dosage: p.dosage || "",
        route: p.route || "",
        source: "template" as const,
        source_ref: t.id,
      }));
      setProducts(prev => [...prev, ...templateProducts]);
      showToast("success", `${t.default_products.length} product${t.default_products.length !== 1 ? "s" : ""} added from template`);
    } else {
      showToast("success", "Template loaded");
    }

    setTemplateOpen(false);
  };

  // Phase B: Load products from protocol event
  const handleProtocolProducts = (protocolProducts: ProductRow[]) => {
    setProducts(prev => [...prev, ...protocolProducts]);
    showToast("success", `${protocolProducts.length} product${protocolProducts.length !== 1 ? "s" : ""} added from protocol`);
  };

  // Live Project Record ID preview — computed here so handleSave can reference it
  const selectedWorkType = (workTypes || []).find(w => w.id === processingType);
  const selectedGroup = (groups || []).find(g => g.id === group);
  const previewParts = [
    date ? (() => {
      const d = new Date(date + "T12:00:00");
      const day = String(d.getDate()).padStart(2, "0");
      const mon = d.toLocaleDateString("en-US", { month: "short" }).toUpperCase();
      const yr = d.getFullYear();
      return `${day}${mon}${yr}`;
    })() : null,
    selectedGroup?.name || null,
    selectedWorkType?.code || null,
  ].filter(Boolean);
  const projectRecordId = previewParts.length > 0 ? previewParts.join("-") : null;

  const handleSave = async (startWorking: boolean) => {
    if (!processingType) { showToast("error", "Processing type is required"); return; }
    setSaving(true);
    try {
      const wt = (workTypes || []).find(w => w.id === processingType);
      const grp = (groups || []).find(g => g.id === group);
      // Use the same live preview ID the user sees at the top
      const saveName = projectRecordId || [wt?.name, grp?.name].filter(Boolean).join(" - ") || "New Project";

      const { data: project, error } = await supabase
        .from("projects")
        .insert({
          operation_id: operationId,
          name: saveName,
          project_id_display: saveName,
          date,
          project_status: "Pending",
          head_count: null,
          group_id: group || null,
          location_id: location || null,
          description: memo.trim() || null,
          record_individual_animals: true,
          // Task 7+8: preload and estimated head
          preload_mode: preloadEnabled ? preloadMode : "none",
          estimated_head: estimatedHead || null,
          field_visibility: fieldConfig as any,
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

      // Task 4: Save products to project_products junction table
      if (products.length > 0) {
        const productRows = products.map(p => ({
          project_id: project.id,
          product_id: p.id,
          dosage: p.dosage || null,
          route: p.route || null,
          source: p.source || "manual",
          source_ref: p.source_ref || null,
        }));

        const { error: prodError } = await supabase
          .from("project_products")
          .insert(productRows);

        if (prodError) {
          console.error("Failed to save products:", prodError);
          showToast("error", "Products failed to save: " + prodError.message);
        }
      }

      // Phase D: Pre-load animals from group
      if (preloadEnabled && groupMembers && groupMembers.length > 0) {
        const animalIds = groupMembers.map((m: any) => m.animal_id);
        const preloadStatus = preloadMode === "worked" ? "Worked" : "Expected";

        // Insert project_expected_animals
        const expectedRows = animalIds.map((aid: string) => ({
          project_id: project.id,
          animal_id: aid,
          status: preloadStatus,
        }));
        const { error: expErr } = await supabase
          .from("project_expected_animals")
          .insert(expectedRows);
        if (expErr) console.error("Failed to insert expected animals:", expErr);

        // Mode 3 (Worked): also create lightweight cow_work records
        if (preloadMode === "worked") {
          const workRows = animalIds.map((aid: string, i: number) => ({
            operation_id: operationId,
            project_id: project.id,
            animal_id: aid,
            date: date,
            record_order: i + 1,
          }));
          const { error: workErr } = await supabase
            .from("cow_work")
            .insert(workRows);
          if (workErr) console.error("Failed to insert worked records:", workErr);

          // Update project status to In Progress
          await supabase
            .from("projects")
            .update({ project_status: "In Progress" })
            .eq("id", project.id);
        }
      }

      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["project-counts"] });
      showToast("success", saveName + " created");

      // Navigate BEFORE any potential secondary failures block it
      const projectId = project.id;
      if (startWorking) {
        navigate("/cow-work/" + projectId);
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

      {/* Live Project Record ID preview */}
      <div
        className="rounded-xl px-3.5 py-3"
        style={{
          background: projectRecordId
            ? "linear-gradient(145deg, #0E2646 0%, #163A5E 55%, #55BAAA 100%)"
            : "#E8E8E4",
          transition: "background 300ms",
        }}
      >
        <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: projectRecordId ? "rgba(168,230,218,0.60)" : "rgba(26,26,26,0.30)", marginBottom: 4 }}>
          PROJECT RECORD ID
        </div>
        <div style={{ fontSize: 18, fontWeight: 700, color: projectRecordId ? "#FFFFFF" : "rgba(26,26,26,0.25)", letterSpacing: "-0.01em" }}>
          {projectRecordId || "Select type and group…"}
        </div>
      </div>

      {/* Form card — Step 1: What & When */}
      <div className="rounded-xl bg-white px-3 py-3.5 space-y-2" style={{ border: "1px solid rgba(212,212,208,0.60)" }}>
        {/* Date */}
        <div className="flex items-center gap-2 min-w-0">
          <label style={LABEL_STYLE}>Date</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} className={INPUT_CLS} />
        </div>

        {/* Type — what are you doing? */}
        <div className="flex items-center gap-2 min-w-0">
          <label style={LABEL_STYLE}>Type</label>
          <select value={processingType} onChange={e => setProcessingType(e.target.value)} className={INPUT_CLS}>
            <option value="" disabled>Select type</option>
            {(workTypes || []).map(wt => (
              <option key={wt.id} value={wt.id}>{wt.code} — {wt.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Step 3: Group & Pre-load — which group, and how to load them? */}
      <div className="rounded-xl bg-white px-3 py-3.5 space-y-2" style={{ border: "1px solid rgba(212,212,208,0.60)" }}>
        {/* Group */}
        <div className="flex items-center gap-2 min-w-0">
          <label style={LABEL_STYLE}>Group</label>
          <select value={group} onChange={e => { setGroup(e.target.value); setPreloadEnabled(false); }} className={INPUT_CLS}>
            <option value="" disabled>Select group</option>
            {(groups || []).map(g => (
              <option key={g.id} value={g.id}>{g.name}</option>
            ))}
          </select>
        </div>

        {/* Pre-load toggle — appears inline when a group is selected */}
        {group && (
          <>
            <div className="flex items-center justify-between pt-1">
              <span style={{ fontSize: 14, fontWeight: 600, color: "#1A1A1A" }}>Pre-load animals from group</span>
              <button
                onClick={() => {
                  setPreloadEnabled(!preloadEnabled);
                  if (preloadEnabled) setPreloadMode("expected");
                }}
                className="relative shrink-0 cursor-pointer"
                style={{
                  width: 44, height: 24, borderRadius: 12, border: "none",
                  backgroundColor: preloadEnabled ? "#55BAAA" : "#CBCED4",
                  transition: "background-color 200ms",
                }}
              >
                <span
                  style={{
                    position: "absolute", top: 2,
                    left: preloadEnabled ? 22 : 2,
                    width: 20, height: 20, borderRadius: 10,
                    backgroundColor: "#FFFFFF",
                    transition: "left 200ms",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.15)",
                  }}
                />
              </button>
            </div>

            {preloadEnabled && (
              <div className="flex gap-4 pt-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="preloadMode"
                    value="expected"
                    checked={preloadMode === "expected"}
                    onChange={() => setPreloadMode("expected")}
                    style={{ accentColor: "#55BAAA" }}
                  />
                  <span style={{ fontSize: 16, color: "#1A1A1A" }}>As Expected</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="preloadMode"
                    value="worked"
                    checked={preloadMode === "worked"}
                    onChange={() => setPreloadMode("worked")}
                    style={{ accentColor: "#55BAAA" }}
                  />
                  <span style={{ fontSize: 16, color: "#1A1A1A" }}>As Worked</span>
                </label>
              </div>
            )}
          </>
        )}

        {/* Cattle Type */}
        <div className="flex items-center gap-2 min-w-0">
          <label style={LABEL_STYLE}>Cattle Type</label>
          <select value={cattleType} onChange={e => setCattleType(e.target.value)} className={INPUT_CLS}>
            <option value="" disabled>Optional</option>
            {cattleTypeOptions.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        </div>

        {/* Expected Head */}
        <div className="flex items-center gap-2 min-w-0">
          <label style={LABEL_STYLE}>Head Expected</label>
          <input
            type="number"
            inputMode="numeric"
            value={estimatedHead}
            onChange={e => setEstimatedHead(e.target.value ? parseInt(e.target.value, 10) : "")}
            placeholder="Optional"
            className={INPUT_CLS}
          />
        </div>

        {/* Location */}
        <div className="flex items-center gap-2 min-w-0">
          <label style={LABEL_STYLE}>Location</label>
          <select value={location} onChange={e => setLocation(e.target.value)} className={INPUT_CLS}>
            <option value="" disabled>Optional</option>
            {(locations || []).map(l => (
              <option key={l.id} value={l.id}>{l.name}</option>
            ))}
          </select>
        </div>

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

      {/* Step 4: Template + Configure Fields */}
      <div className="rounded-xl bg-white overflow-hidden" style={{ border: "1px solid rgba(212,212,208,0.60)" }}>
        {/* Load from Template — collapsible inside this card */}
        <button
          className="flex items-center justify-between w-full px-3 py-3 cursor-pointer active:scale-[0.99]"
          style={{ background: "none", border: "none", borderBottom: "1px solid rgba(212,212,208,0.30)" }}
          onClick={() => setTemplateOpen(!templateOpen)}
        >
          <span style={{ fontSize: 14, fontWeight: 600, color: "#1A1A1A" }}>Load from Template</span>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"
            style={{ transform: templateOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 200ms" }}>
            <path d="M4 6L8 10L12 6" stroke="rgba(26,26,26,0.40)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        {templateOpen && (
          <div className="px-3 pb-2" style={{ borderBottom: "1px solid rgba(212,212,208,0.30)" }}>
            {(templates || []).length === 0 ? (
              <div className="text-center py-3" style={{ fontSize: 13, color: "rgba(26,26,26,0.40)" }}>No templates</div>
            ) : (
              (templates || []).map(t => {
                const tProducts = Array.isArray(t.default_products) ? (t.default_products as any[]) : [];
                return (
                  <button
                    key={t.id}
                    className="flex items-center justify-between w-full py-2.5 cursor-pointer active:bg-[rgba(26,26,26,0.02)]"
                    style={{ background: "none", border: "none", borderBottom: "1px solid rgba(26,26,26,0.06)" }}
                    onClick={() => handleTemplateSelect(t)}
                  >
                    <div className="text-left min-w-0">
                      <span style={{ fontSize: 14, fontWeight: 600, color: "#1A1A1A" }}>{t.name}</span>
                      <div className="flex items-center gap-2 mt-0.5">
                        {t.default_cattle_type && (
                          <span style={{ fontSize: 11, color: "rgba(26,26,26,0.45)" }}>{t.default_cattle_type}</span>
                        )}
                        {tProducts.length > 0 && (
                          <span style={{ fontSize: 11, color: "rgba(26,26,26,0.40)" }}>
                            {tProducts.length} product{tProducts.length !== 1 ? "s" : ""}
                          </span>
                        )}
                      </div>
                    </div>
                    <span
                      className="rounded-full shrink-0"
                      style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.06em", padding: "2px 8px", backgroundColor: "rgba(243,209,42,0.15)", color: "#C4A600" }}
                    >
                      {(t.work_type as any)?.code || ""}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* Configure Fields — what fields show on the Add tab? */}
      <ConfigureFieldsSection
        workTypeCode={selectedWorkType?.code || ""}
        config={fieldConfig}
        onChange={setFieldConfig}
      />

      {/* Products Given collapsible */}
      <div className="rounded-xl bg-white overflow-hidden" style={{ border: "1px solid rgba(212,212,208,0.60)" }}>
        <button
          className="flex items-center justify-between w-full px-3 py-3.5 cursor-pointer active:scale-[0.99]"
          onClick={() => setProductsOpen(!productsOpen)}
        >
          <span style={{ fontSize: 15, fontWeight: 600, color: "#1A1A1A" }}>Products Given</span>
          <div className="flex items-center gap-2">
            {products.length > 0 && (
              <span style={{ fontSize: 12, color: "rgba(26,26,26,0.40)" }}>
                {products.length} product{products.length !== 1 ? "s" : ""}
              </span>
            )}
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none"
              style={{ transform: productsOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 200ms" }}>
              <path d="M4.5 6.75L9 11.25L13.5 6.75" stroke="rgba(26,26,26,0.40)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </button>

        {productsOpen && (
          <div className="px-3 pb-3" style={{ borderTop: "1px solid rgba(212,212,208,0.40)" }}>
            {products.length === 0 ? (
              <div className="text-center py-3" style={{ fontSize: 13, color: "rgba(26,26,26,0.40)" }}>No products added</div>
            ) : (
              products.map((p, i) => (
                <div key={`${p.id}-${i}`} className="flex items-center gap-2 py-2" style={{ borderBottom: "1px solid rgba(26,26,26,0.06)" }}>
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

            {/* Product action buttons */}
            {!productPickerOpen ? (
              <div className="flex gap-2 mt-2 flex-wrap">
                <button
                  className="rounded-full px-4 py-2 border border-[#D4D4D0] bg-white cursor-pointer active:scale-[0.97]"
                  style={{ fontSize: 13, fontWeight: 600, color: "#0E2646" }}
                  onClick={() => setProductPickerOpen(true)}
                >
                  + Add Product
                </button>
                <button
                  className="rounded-full px-4 py-2 border border-[#55BAAA] bg-white cursor-pointer active:scale-[0.97]"
                  style={{ fontSize: 13, fontWeight: 600, color: "#55BAAA" }}
                  onClick={() => setProtocolDrawerOpen(true)}
                >
                  Load from Protocol
                </button>
              </div>
            ) : (
              <div className="mt-2 space-y-1.5">
                <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.08em", color: "rgba(26,26,26,0.35)", textTransform: "uppercase" }}>SELECT PRODUCTS</div>
                {/* Search input */}
                <div className="flex items-center gap-2 bg-white rounded-lg px-3 h-10" style={{ border: "1px solid #D4D4D0" }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(26,26,26,0.30)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                    <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                  <input
                    type="text"
                    value={productSearch}
                    onChange={e => setProductSearch(e.target.value)}
                    placeholder="Search products…"
                    className="flex-1 outline-none bg-transparent"
                    style={{ fontSize: 16, color: "#1A1A1A" }}
                  />
                  {productSearch && (
                    <button
                      className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 cursor-pointer"
                      style={{ backgroundColor: "rgba(26,26,26,0.08)", fontSize: 11, color: "rgba(26,26,26,0.50)", border: "none" }}
                      onClick={() => setProductSearch("")}
                    >×</button>
                  )}
                </div>
                {(allProducts || []).length === 0 ? (
                  <div style={{ fontSize: 13, color: "rgba(26,26,26,0.40)", padding: "8px 0" }}>
                    No products available
                  </div>
                ) : (
                  <div className="max-h-56 overflow-y-auto space-y-0 rounded-lg" style={{ border: "1px solid #D4D4D0" }}>
                    {(allProducts || [])
                      .filter(p => !productSearch || p.name.toLowerCase().includes(productSearch.toLowerCase()) || (p.product_type || "").toLowerCase().includes(productSearch.toLowerCase()))
                      .map(prod => {
                        const isSelected = products.some(p => p.id === prod.id);
                        return (
                          <button
                            key={prod.id}
                            className="flex items-center gap-2.5 w-full px-3 py-2.5 cursor-pointer active:bg-[rgba(26,26,26,0.03)]"
                            style={{
                              background: isSelected ? "rgba(85,186,170,0.08)" : "white",
                              border: "none",
                              borderBottom: "1px solid rgba(26,26,26,0.06)",
                              textAlign: "left" as const,
                            }}
                            onClick={() => {
                              if (isSelected) {
                                setProducts(prev => prev.filter(p => p.id !== prod.id));
                              } else {
                                setProducts(prev => [...prev, {
                                  id: prod.id,
                                  name: prod.name,
                                  dosage: prod.dosage || "",
                                  route: prod.route || "",
                                  source: "manual",
                                }]);
                              }
                            }}
                          >
                            {/* Checkbox */}
                            <div
                              className="shrink-0 rounded flex items-center justify-center"
                              style={{
                                width: 20, height: 20,
                                border: isSelected ? "none" : "2px solid #D4D4D0",
                                backgroundColor: isSelected ? "#55BAAA" : "white",
                              }}
                            >
                              {isSelected && (
                                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                                  <path d="M2.5 6L5 8.5L9.5 3.5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <span className="truncate block" style={{ fontSize: 14, fontWeight: isSelected ? 700 : 500, color: "#1A1A1A" }}>{prod.name}</span>
                              <span style={{ fontSize: 11, color: "rgba(26,26,26,0.40)" }}>
                                {[prod.product_type, prod.dosage, prod.route].filter(Boolean).join(" · ")}
                              </span>
                            </div>
                          </button>
                        );
                      })}
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span style={{ fontSize: 12, fontWeight: 600, color: "#55BAAA" }}>
                    {products.length} selected
                  </span>
                  <button
                    className="rounded-full px-4 py-1.5 bg-[#0E2646] cursor-pointer active:scale-[0.97]"
                    style={{ fontSize: 12, fontWeight: 700, color: "white", border: "none" }}
                    onClick={() => { setProductPickerOpen(false); setProductSearch(""); }}
                  >
                    Done
                  </button>
                </div>
              </div>
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

      {/* Phase B: Protocol product loader */}
      <LoadFromProtocolDrawer
        open={protocolDrawerOpen}
        onOpenChange={setProtocolDrawerOpen}
        onLoadProducts={handleProtocolProducts}
      />
    </div>
  );
}
