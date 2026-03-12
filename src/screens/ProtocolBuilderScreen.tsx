import { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOperation } from "@/contexts/OperationContext";
import { useChuteSideToast } from "@/components/ToastContext";
import { LABEL_STYLE, INPUT_CLS, SUB_LABEL } from "@/lib/styles";
import { ANIMAL_TYPE_OPTIONS, WORK_TYPES as WORK_TYPES_FALLBACK } from "@/lib/constants";

/* ── Types ── */

interface EventProduct {
  product_id: string;
  name: string;
  dosage: string;
  route: string;
  injection_site: string;
  notes: string;
}

interface ProtocolEvent {
  id?: string;
  event_name: string;
  work_type_code: string;
  days_offset: number;
  timing_description: string;
  equipment_notes: string;
  clinical_notes: string;
  products: EventProduct[];
}

const INJECTION_SITES = [
  "Left Neck",
  "Right Neck",
  "Behind Ear",
  "Rump",
  "Intranasal",
  "Topical",
  "N/A",
];

const PRODUCT_TYPE_FILTERS = [
  { value: "all", label: "All", color: "#717182" },
  { value: "vaccine", label: "Vaccine", color: "#55BAAA" },
  { value: "antibiotic", label: "Antibiotic", color: "#E87461" },
  { value: "parasiticide", label: "Parasiticide", color: "#55BAAA" },
  { value: "synchronization", label: "Sync", color: "#A8A8F0" },
  { value: "supplement", label: "Supplement", color: "#F3D12A" },
  { value: "anti-inflammatory", label: "Anti-Inflam", color: "#E87461" },
  { value: "other", label: "Other", color: "#A8A8A8" },
];

function emptyEvent(): ProtocolEvent {
  return {
    event_name: "",
    work_type_code: "",
    days_offset: 0,
    timing_description: "",
    equipment_notes: "",
    clinical_notes: "",
    products: [],
  };
}

/* ── Product Search Modal ── */

function ProductSearchModal({
  open,
  onClose,
  onSelect,
  operationId,
  alreadyAdded,
}: {
  open: boolean;
  onClose: () => void;
  onSelect: (p: EventProduct) => void;
  operationId: string;
  alreadyAdded: string[];
}) {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");

  const { data: allProducts } = useQuery({
    queryKey: ["global-products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, name, product_type, dosage, route")
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
        .select("product_id, is_favorite")
        .eq("operation_id", operationId)
        .eq("is_favorite", true);
      if (error) throw error;
      return new Set((data || []).map((d) => d.product_id));
    },
    enabled: open,
  });

  if (!open) return null;

  const favSet = favorites || new Set<string>();
  const filtered = (allProducts || [])
    .filter((p) => typeFilter === "all" || p.product_type === typeFilter)
    .filter((p) => !search || p.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      const af = favSet.has(a.id) ? 0 : 1;
      const bf = favSet.has(b.id) ? 0 : 1;
      if (af !== bf) return af - bf;
      return a.name.localeCompare(b.name);
    });

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ background: "rgba(0,0,0,0.45)" }}>
      <div
        className="w-full max-w-lg bg-white rounded-t-2xl overflow-hidden flex flex-col"
        style={{ maxHeight: "80vh" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: "1px solid #D4D4D0" }}>
          <span style={{ fontSize: 16, fontWeight: 700, color: "#1A1A1A" }}>Add Product</span>
          <button
            onClick={onClose}
            className="cursor-pointer"
            style={{ fontSize: 22, color: "rgba(26,26,26,0.4)", background: "none", border: "none" }}
          >
            ×
          </button>
        </div>

        {/* Search */}
        <div className="px-4 pt-3 pb-2">
          <input
            className={INPUT_CLS}
            placeholder="Search products…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
            style={{ width: "100%", fontSize: 16 }}
          />
        </div>

        {/* Type filter pills */}
        <div className="px-4 pb-2 flex gap-1.5 flex-wrap">
          {PRODUCT_TYPE_FILTERS.map((f) => {
            const active = typeFilter === f.value;
            return (
              <button
                key={f.value}
                className="rounded-full px-2.5 py-1 cursor-pointer active:scale-[0.95]"
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  border: `1.5px solid ${active ? f.color : "#D4D4D0"}`,
                  backgroundColor: active ? `${f.color}18` : "white",
                  color: active ? f.color : "#717182",
                }}
                onClick={() => setTypeFilter(f.value)}
              >
                {f.label}
              </button>
            );
          })}
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto px-4 pb-4">
          {filtered.length === 0 && (
            <div className="py-6 text-center" style={{ fontSize: 13, color: "rgba(26,26,26,0.4)" }}>
              No products found
            </div>
          )}
          {filtered.map((p) => {
            const added = alreadyAdded.includes(p.id);
            const isFav = favSet.has(p.id);
            return (
              <button
                key={p.id}
                disabled={added}
                className="w-full text-left flex items-center gap-2 py-2.5 cursor-pointer active:bg-[rgba(26,26,26,0.03)]"
                style={{
                  opacity: added ? 0.4 : 1,
                  background: "none",
                  border: "none",
                  borderBottomWidth: 1,
                  borderBottomStyle: "solid",
                  borderBottomColor: "rgba(26,26,26,0.06)",
                }}
                onClick={() => {
                  onSelect({
                    product_id: p.id,
                    name: p.name,
                    dosage: p.dosage || "",
                    route: p.route || "",
                    injection_site: "",
                    notes: "",
                  });
                  onClose();
                }}
              >
                {isFav && <span style={{ color: "#F3D12A", fontSize: 14 }}>★</span>}
                <span className="flex-1 min-w-0 truncate" style={{ fontSize: 14, fontWeight: 600, color: "#1A1A1A" }}>
                  {p.name}
                </span>
                <span
                  className="rounded-full px-2 py-0.5 shrink-0"
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    backgroundColor: (PRODUCT_TYPE_FILTERS.find((f) => f.value === p.product_type)?.color || "#A8A8A8") + "18",
                    color: PRODUCT_TYPE_FILTERS.find((f) => f.value === p.product_type)?.color || "#A8A8A8",
                  }}
                >
                  {p.product_type}
                </span>
                <span className="shrink-0 ml-1" style={{ fontSize: 12, color: "rgba(26,26,26,0.4)" }}>
                  {added ? "Added" : p.route || ""}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ── Main Screen ── */

export default function ProtocolBuilderScreen() {
  const { id } = useParams<{ id: string }>();
  const isEditing = !!id;
  const navigate = useNavigate();
  const { operationId } = useOperation();
  const { showToast } = useChuteSideToast();
  const queryClient = useQueryClient();

  const [name, setName] = useState("");
  const [animalType, setAnimalType] = useState("");
  const [description, setDescription] = useState("");
  const [events, setEvents] = useState<ProtocolEvent[]>([emptyEvent()]);
  const [saving, setSaving] = useState(false);
  const [productModalEventIdx, setProductModalEventIdx] = useState<number | null>(null);

  // Query work_types from Supabase (live data, fallback to constant)
  const { data: dbWorkTypes } = useQuery({
    queryKey: ["work-types"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("work_types")
        .select("id, code, name")
        .order("name");
      if (error) throw error;
      return data || [];
    },
  });
  const workTypesList = dbWorkTypes && dbWorkTypes.length > 0
    ? dbWorkTypes.map((wt) => ({ code: wt.code, name: wt.name }))
    : WORK_TYPES_FALLBACK.map((wt) => ({ code: wt.code, name: wt.name }));

  // Load existing protocol when editing
  const { data: existing } = useQuery({
    queryKey: ["protocol-detail", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vaccination_protocol_templates")
        .select("*, events:protocol_template_events(*, products:protocol_event_products(*, product:products(id, name)))")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: isEditing,
  });

  useEffect(() => {
    if (!existing) return;
    setName(existing.name);
    setAnimalType(existing.animal_class);
    setDescription(existing.description || "");
    const evts = ((existing as any).events || [])
      .sort((a: any, b: any) => a.event_order - b.event_order)
      .map((e: any) => ({
        id: e.id,
        event_name: e.event_name,
        work_type_code: "",
        days_offset: e.days_offset,
        timing_description: e.timing_description || "",
        equipment_notes: e.equipment_notes || "",
        clinical_notes: e.clinical_notes || "",
        products: (e.products || []).map((p: any) => ({
          product_id: p.product_id,
          name: (p.product as any)?.name || "",
          dosage: p.dosage_override || "",
          route: p.route_override || "",
          injection_site: p.injection_site || "",
          notes: p.notes || "",
        })),
      }));
    if (evts.length > 0) setEvents(evts);
  }, [existing]);

  const updateEvent = useCallback(
    (idx: number, patch: Partial<ProtocolEvent>) => {
      setEvents((prev) => prev.map((e, i) => (i === idx ? { ...e, ...patch } : e)));
    },
    []
  );

  const updateProduct = useCallback(
    (eventIdx: number, prodIdx: number, patch: Partial<EventProduct>) => {
      setEvents((prev) =>
        prev.map((e, ei) =>
          ei === eventIdx
            ? { ...e, products: e.products.map((p, pi) => (pi === prodIdx ? { ...p, ...patch } : p)) }
            : e
        )
      );
    },
    []
  );

  const removeProduct = useCallback((eventIdx: number, prodIdx: number) => {
    setEvents((prev) =>
      prev.map((e, ei) =>
        ei === eventIdx ? { ...e, products: e.products.filter((_, pi) => pi !== prodIdx) } : e
      )
    );
  }, []);

  const removeEvent = useCallback((idx: number) => {
    setEvents((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((_, i) => i !== idx);
    });
  }, []);

  const handleSave = async (activate: boolean) => {
    if (!name.trim()) {
      showToast("error", "Protocol name is required");
      return;
    }
    if (!animalType) {
      showToast("error", "Animal type is required");
      return;
    }
    setSaving(true);
    try {
      let templateId: string;

      if (isEditing) {
        const { error } = await supabase
          .from("vaccination_protocol_templates")
          .update({
            name: name.trim(),
            animal_class: animalType,
            description: description.trim() || null,
            is_active: activate,
          })
          .eq("id", id!);
        if (error) throw error;
        templateId = id!;

        // Delete old events+products then re-insert
        await supabase.from("protocol_template_events").delete().eq("template_id", templateId);
      } else {
        const { data, error } = await supabase
          .from("vaccination_protocol_templates")
          .insert({
            name: name.trim(),
            animal_class: animalType,
            description: description.trim() || null,
            operation_id: operationId,
            is_active: activate,
          })
          .select()
          .single();
        if (error) throw error;
        templateId = data.id;
      }

      // Insert events
      for (let i = 0; i < events.length; i++) {
        const evt = events[i];
        const workType = WORK_TYPES.find((w) => w.code === evt.work_type_code);
        const { data: evtData, error: evtErr } = await supabase
          .from("protocol_template_events")
          .insert({
            template_id: templateId,
            event_name: evt.event_name || workType?.name || `Event ${i + 1}`,
            event_order: i + 1,
            days_offset: evt.days_offset,
            timing_description: evt.timing_description || null,
            equipment_notes: evt.equipment_notes || null,
            clinical_notes: evt.clinical_notes || null,
          })
          .select()
          .single();
        if (evtErr) throw evtErr;

        // Insert products for this event
        if (evt.products.length > 0) {
          const rows = evt.products.map((p, pi) => ({
            event_id: evtData.id,
            product_id: p.product_id,
            dosage_override: p.dosage || null,
            route_override: p.route || null,
            injection_site: p.injection_site || null,
            notes: p.notes || null,
            sort_order: pi,
          }));
          const { error: pepErr } = await supabase.from("protocol_event_products").insert(rows);
          if (pepErr) throw pepErr;
        }
      }

      queryClient.invalidateQueries({ queryKey: ["vaccination-protocols"] });
      queryClient.invalidateQueries({ queryKey: ["protocol-detail", id] });
      showToast("success", `Protocol ${activate ? "activated" : "saved as draft"}`);
      navigate("/protocols");
    } catch (err: any) {
      showToast("error", err.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="px-4 pt-4 pb-28 space-y-3" style={{ backgroundColor: "#F5F5F0", minHeight: "100vh" }}>
      {/* Section label */}
      <div style={SUB_LABEL}>{isEditing ? "EDIT PROTOCOL" : "NEW PROTOCOL"}</div>

      {/* Header card */}
      <div className="rounded-lg bg-white px-3 py-3.5 space-y-2" style={{ border: "1px solid #D4D4D0" }}>
        <div className="flex items-center gap-3 min-w-0">
          <label style={LABEL_STYLE}>
            Name<span style={{ color: "#9B2335", marginLeft: 2 }}>*</span>
          </label>
          <input
            className={INPUT_CLS}
            placeholder="e.g. Spring Calf Protocol"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-3 min-w-0">
          <label style={LABEL_STYLE}>
            Type<span style={{ color: "#9B2335", marginLeft: 2 }}>*</span>
          </label>
          <select className={INPUT_CLS} value={animalType} onChange={(e) => setAnimalType(e.target.value)}>
            <option value="" disabled>
              Select type
            </option>
            {ANIMAL_TYPE_OPTIONS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-start gap-3 min-w-0">
          <label style={{ ...LABEL_STYLE, marginTop: 8 }}>Description</label>
          <textarea
            className="flex-1 min-w-0 rounded-lg border border-[#D4D4D0] bg-white px-3 py-2 text-base outline-none transition-all focus:border-[#F3D12A] focus:ring-2 focus:ring-[#F3D12A]/25 resize-none"
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional description…"
          />
        </div>
      </div>

      {/* Work Type Events */}
      <div style={SUB_LABEL}>WORK TYPES</div>

      {events.map((evt, idx) => (
        <div key={idx}>
          {/* Timeline connector */}
          {idx > 0 && (
            <div className="flex flex-col items-center py-1">
              <div style={{ width: 2, height: 16, backgroundColor: "#D4D4D0" }} />
              <span
                className="rounded-full px-2.5 py-0.5"
                style={{ fontSize: 11, fontWeight: 600, color: "#55BAAA", backgroundColor: "rgba(85,186,170,0.12)" }}
              >
                {evt.days_offset} day{evt.days_offset !== 1 ? "s" : ""} later
              </span>
              <div style={{ width: 2, height: 16, backgroundColor: "#D4D4D0" }} />
            </div>
          )}

          {/* Event card */}
          <div
            className="rounded-lg bg-white px-3 py-3 space-y-2 shadow-sm"
            style={{ border: "1px solid #D4D4D0", borderLeft: "4px solid #55BAAA" }}
          >
            <div className="flex items-center gap-3 min-w-0">
              <label style={LABEL_STYLE}>Work Type</label>
              <select
                className={INPUT_CLS}
                value={evt.work_type_code}
                onChange={(e) => {
                  const code = e.target.value;
                  const wt = WORK_TYPES.find((w) => w.code === code);
                  updateEvent(idx, {
                    work_type_code: code,
                    event_name: evt.event_name || wt?.name || "",
                  });
                }}
              >
                <option value="">Select work type</option>
                {WORK_TYPES.map((w) => (
                  <option key={w.code} value={w.code}>
                    {w.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-3 min-w-0">
              <label style={LABEL_STYLE}>Label</label>
              <input
                className={INPUT_CLS}
                placeholder={`Event ${idx + 1}`}
                value={evt.event_name}
                onChange={(e) => updateEvent(idx, { event_name: e.target.value })}
              />
            </div>
            <div className="flex items-center gap-3 min-w-0">
              <label style={LABEL_STYLE}>Days Offset</label>
              <input
                type="number"
                min={0}
                className={INPUT_CLS}
                value={evt.days_offset}
                onChange={(e) => updateEvent(idx, { days_offset: parseInt(e.target.value) || 0 })}
                style={{ maxWidth: 100 }}
              />
            </div>
            <div className="flex items-center gap-3 min-w-0">
              <label style={LABEL_STYLE}>Timing</label>
              <input
                className={INPUT_CLS}
                placeholder="e.g. April/May, calves 60-120 days"
                value={evt.timing_description}
                onChange={(e) => updateEvent(idx, { timing_description: e.target.value })}
              />
            </div>

            {/* Product list */}
            <div style={{ ...SUB_LABEL, marginTop: 8 }}>PRODUCTS</div>
            {evt.products.length === 0 ? (
              <div style={{ fontSize: 13, color: "rgba(26,26,26,0.35)", padding: "4px 0" }}>No products added</div>
            ) : (
              <div className="space-y-1.5">
                {evt.products.map((p, pi) => (
                  <div
                    key={pi}
                    className="rounded-lg px-2.5 py-2 space-y-1.5"
                    style={{ backgroundColor: "#F5F5F0", border: "1px solid rgba(212,212,208,0.5)" }}
                  >
                    <div className="flex items-center gap-2">
                      <span className="flex-1 truncate" style={{ fontSize: 14, fontWeight: 600, color: "#1A1A1A" }}>
                        {p.name}
                      </span>
                      <button
                        className="cursor-pointer shrink-0 active:scale-[0.9]"
                        style={{ fontSize: 18, color: "rgba(26,26,26,0.3)", background: "none", border: "none" }}
                        onClick={() => removeProduct(idx, pi)}
                      >
                        ×
                      </button>
                    </div>
                    <div className="flex gap-1.5 flex-wrap">
                      <input
                        className={INPUT_CLS}
                        style={{ width: 80 }}
                        placeholder="Dosage"
                        value={p.dosage}
                        onChange={(e) => updateProduct(idx, pi, { dosage: e.target.value })}
                      />
                      <input
                        className={INPUT_CLS}
                        style={{ width: 60 }}
                        placeholder="Route"
                        value={p.route}
                        onChange={(e) => updateProduct(idx, pi, { route: e.target.value })}
                      />
                      <select
                        className={INPUT_CLS}
                        value={p.injection_site}
                        onChange={(e) => updateProduct(idx, pi, { injection_site: e.target.value })}
                      >
                        <option value="">Site…</option>
                        {INJECTION_SITES.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                      <input
                        className={`${INPUT_CLS} flex-1 min-w-[60px]`}
                        placeholder="Notes"
                        value={p.notes}
                        onChange={(e) => updateProduct(idx, pi, { notes: e.target.value })}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}

            <button
              className="rounded-full px-4 py-1.5 cursor-pointer active:scale-[0.97]"
              style={{ fontSize: 13, fontWeight: 600, color: "#55BAAA", border: "1.5px solid #55BAAA", background: "none" }}
              onClick={() => setProductModalEventIdx(idx)}
            >
              + Add Product
            </button>

            {/* Equipment & Clinical notes */}
            <div className="flex items-center gap-3 min-w-0 pt-1">
              <label style={LABEL_STYLE}>Equipment</label>
              <input
                className={INPUT_CLS}
                placeholder="Optional equipment notes"
                value={evt.equipment_notes}
                onChange={(e) => updateEvent(idx, { equipment_notes: e.target.value })}
              />
            </div>
            <div className="flex items-start gap-3 min-w-0">
              <label style={{ ...LABEL_STYLE, marginTop: 8 }}>Clinical</label>
              <textarea
                className="flex-1 min-w-0 rounded-lg border border-[#D4D4D0] bg-white px-3 py-2 text-base outline-none transition-all focus:border-[#F3D12A] focus:ring-2 focus:ring-[#F3D12A]/25 resize-none"
                rows={2}
                placeholder="Clinical notes…"
                value={evt.clinical_notes}
                onChange={(e) => updateEvent(idx, { clinical_notes: e.target.value })}
              />
            </div>

            {/* Delete event */}
            {events.length > 1 && (
              <div className="flex justify-end pt-1">
                <button
                  className="cursor-pointer active:scale-[0.95]"
                  style={{ fontSize: 12, fontWeight: 600, color: "#9B2335", background: "none", border: "none" }}
                  onClick={() => removeEvent(idx)}
                >
                  Delete Work Type
                </button>
              </div>
            )}
          </div>
        </div>
      ))}

      {/* Add event button */}
      <button
        className="w-full rounded-full py-3 cursor-pointer active:scale-[0.97]"
        style={{ fontSize: 14, fontWeight: 600, color: "#1A1A1A", border: "2px solid #F3D12A", background: "none" }}
        onClick={() => {
          const lastOffset = events.length > 0 ? events[events.length - 1].days_offset : 0;
          setEvents((prev) => [...prev, { ...emptyEvent(), days_offset: lastOffset + 28 }]);
        }}
      >
        + Add Work Type
      </button>

      {/* Product search modal */}
      <ProductSearchModal
        open={productModalEventIdx !== null}
        onClose={() => setProductModalEventIdx(null)}
        operationId={operationId}
        alreadyAdded={
          productModalEventIdx !== null ? events[productModalEventIdx]?.products.map((p) => p.product_id) || [] : []
        }
        onSelect={(p) => {
          if (productModalEventIdx !== null) {
            updateEvent(productModalEventIdx, {
              products: [...events[productModalEventIdx].products, p],
            });
          }
        }}
      />

      {/* Bottom action bar */}
      <div
        className="fixed bottom-0 left-0 right-0 flex gap-3 px-4 py-3 bg-white z-40"
        style={{ borderTop: "1px solid #D4D4D0", boxShadow: "0 -2px 8px rgba(0,0,0,0.06)" }}
      >
        <button
          className="flex-1 rounded-full py-3 cursor-pointer active:scale-[0.97]"
          style={{ fontSize: 14, fontWeight: 600, color: "#0E2646", border: "2px solid #0E2646", background: "none", opacity: saving ? 0.5 : 1 }}
          disabled={saving}
          onClick={() => handleSave(false)}
        >
          {saving ? "Saving…" : "Save Draft"}
        </button>
        <button
          className="flex-1 rounded-full py-3 cursor-pointer active:scale-[0.97]"
          style={{ fontSize: 14, fontWeight: 700, color: "#1A1A1A", backgroundColor: "#F3D12A", border: "none", opacity: saving ? 0.5 : 1 }}
          disabled={saving}
          onClick={() => handleSave(true)}
        >
          {saving ? "Saving…" : "Save & Activate"}
        </button>
      </div>
    </div>
  );
}
