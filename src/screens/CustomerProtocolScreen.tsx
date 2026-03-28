import { useState, useCallback, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { useOperation } from "@/contexts/OperationContext";
import { useChuteSideToast } from "@/components/ToastContext";
import { COLORS, ANIMAL_TYPE_OPTIONS } from "@/lib/constants";
import { INPUT_CLS } from "@/lib/styles";
import { Skeleton } from "@/components/ui/skeleton";
import ProductSearchModal, { type SelectedProduct } from "@/components/ProductSearchModal";
import {
  ChevronLeft, ChevronRight, ChevronDown, ChevronUp,
  Plus, X, Check, Copy, FileText,
} from "lucide-react";
import { DEFAULT_STAGES, STAGE_TIMING_HINTS, CLASS_BADGE_COLORS, type ProtocolAnimalType } from "@/lib/protocol-constants";
import { generateProtocolPDF } from "@/lib/protocol-pdf";
import { useProductCosts, calcProductCost, formatCost } from "@/hooks/useProductCosts";

interface RecommendedProduct {
  product_id: string;
  product_name: string;
  dosage: string | null;
  route: string | null;
  notes: string | null;
}

interface StageData {
  id?: string;
  event_name: string;
  scheduled_date: string | null;
  event_status: string;
  completion_notes: string;
  actual_head_count: number | null;
  products: RecommendedProduct[];
  hasData: boolean;
  expanded: boolean;
}

interface AnimalSection {
  id?: string;
  animal_class: string;
  estimated_head_count: number | null;
  stages: StageData[];
  expanded: boolean;
}

const CURRENT_YEAR = new Date().getFullYear();

export default function CustomerProtocolScreen() {
  const { operationId: clientOpId } = useParams<{ operationId: string }>();
  const { operationId: vetOpId, operationName } = useOperation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { showToast } = useChuteSideToast();

  const [selectedYear, setSelectedYear] = useState(CURRENT_YEAR);
  const [sections, setSections] = useState<AnimalSection[] | null>(null);
  const [productModal, setProductModal] = useState<{ sectionIdx: number; stageIdx: number } | null>(null);
  const [saving, setSaving] = useState(false);
  const [addTypeOpen, setAddTypeOpen] = useState(false);

  const isCurrentYear = selectedYear === CURRENT_YEAR;
  const isDraft = isCurrentYear;

  /* ── Customer name ── */
  const { data: customer } = useQuery({
    queryKey: ["customer-op", clientOpId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("operations")
        .select("id, name")
        .eq("id", clientOpId!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!clientOpId,
  });

  /* ── Available years ── */
  const { data: availableYears } = useQuery({
    queryKey: ["protocol-years", clientOpId],
    queryFn: async () => {
      const { data } = await supabase
        .from("assigned_protocols")
        .select("protocol_year")
        .eq("client_operation_id", clientOpId!);
      const years = [...new Set((data || []).map(d => d.protocol_year).filter((y): y is number => y !== null))];
      if (!years.includes(CURRENT_YEAR)) years.push(CURRENT_YEAR);
      return years.sort((a, b) => a - b);
    },
    enabled: !!clientOpId,
  });

  /* ── Protocol data for selected year ── */
  const { data: protocolData, isLoading } = useQuery({
    queryKey: ["customer-protocols", clientOpId, selectedYear],
    queryFn: async () => {
      const { data: protocols, error } = await supabase
        .from("assigned_protocols")
        .select(`
          id, animal_class, estimated_head_count, protocol_status, notes,
          events:assigned_protocol_events(
            id, event_name, scheduled_date, event_status, completion_notes,
            actual_head_count, recommended_products
          )
        `)
        .eq("client_operation_id", clientOpId!)
        .eq("protocol_year", selectedYear);
      if (error) throw error;
      return protocols || [];
    },
    enabled: !!clientOpId,
  });

  /* ── Build sections from data ── */
  const buildSections = useCallback((protocols: any[]): AnimalSection[] => {
    if (!protocols || protocols.length === 0) return [];

    return protocols.map((p: any) => {
      const stageNames = DEFAULT_STAGES[p.animal_class as ProtocolAnimalType] || [];
      const eventMap = new Map<string, any>();
      (p.events || []).forEach((e: any) => eventMap.set(e.event_name, e));

      const stages: StageData[] = stageNames.map((stageName) => {
        const ev = eventMap.get(stageName);
        const products: RecommendedProduct[] = ev
          ? (Array.isArray(ev.recommended_products) ? ev.recommended_products : []).map((rp: any) => ({
              product_id: rp.product_id || "",
              product_name: rp.product_name || rp.name || "Unknown",
              dosage: rp.dosage || null,
              route: rp.route || null,
              notes: rp.notes || null,
            }))
          : [];

        return {
          id: ev?.id,
          event_name: stageName,
          scheduled_date: ev?.scheduled_date || null,
          event_status: ev?.event_status || "upcoming",
          completion_notes: ev?.completion_notes || "",
          actual_head_count: ev?.actual_head_count || null,
          products,
          hasData: !!ev,
          expanded: !!ev,
        };
      });

      // Add any events not in the reference map
      (p.events || []).forEach((e: any) => {
        if (!stageNames.includes(e.event_name)) {
          const products: RecommendedProduct[] = (Array.isArray(e.recommended_products) ? e.recommended_products : []).map((rp: any) => ({
            product_id: rp.product_id || "",
            product_name: rp.product_name || rp.name || "Unknown",
            dosage: rp.dosage || null,
            route: rp.route || null,
            notes: rp.notes || null,
          }));
          stages.push({
            id: e.id,
            event_name: e.event_name,
            scheduled_date: e.scheduled_date,
            event_status: e.event_status || "upcoming",
            completion_notes: e.completion_notes || "",
            actual_head_count: e.actual_head_count || null,
            products,
            hasData: true,
            expanded: true,
          });
        }
      });

      return {
        id: p.id,
        animal_class: p.animal_class,
        estimated_head_count: p.estimated_head_count,
        stages,
        expanded: true,
      };
    });
  }, []);

  /* Initialize sections when data loads */
  useMemo(() => {
    if (protocolData && sections === null) {
      setSections(buildSections(protocolData));
    }
  }, [protocolData, sections, buildSections]);

  const changeYear = (year: number) => {
    setSections(null);
    setSelectedYear(year);
  };

  /* ── Helpers ── */
  const updateStage = (sIdx: number, stIdx: number, patch: Partial<StageData>) => {
    setSections((prev) => {
      if (!prev) return prev;
      const next = [...prev];
      next[sIdx] = { ...next[sIdx], stages: [...next[sIdx].stages] };
      next[sIdx].stages[stIdx] = { ...next[sIdx].stages[stIdx], ...patch };
      return next;
    });
  };

  const addProduct = (sIdx: number, stIdx: number, product: SelectedProduct) => {
    setSections((prev) => {
      if (!prev) return prev;
      const next = [...prev];
      const stage = { ...next[sIdx].stages[stIdx] };
      stage.products = [...stage.products, {
        product_id: product.product_id,
        product_name: product.name,
        dosage: product.dosage,
        route: product.route,
        notes: null,
      }];
      stage.hasData = true;
      stage.expanded = true;
      next[sIdx] = { ...next[sIdx], stages: [...next[sIdx].stages] };
      next[sIdx].stages[stIdx] = stage;
      return next;
    });
  };

  const removeProduct = (sIdx: number, stIdx: number, pIdx: number) => {
    setSections((prev) => {
      if (!prev) return prev;
      const next = [...prev];
      const stage = { ...next[sIdx].stages[stIdx] };
      stage.products = stage.products.filter((_, i) => i !== pIdx);
      next[sIdx] = { ...next[sIdx], stages: [...next[sIdx].stages] };
      next[sIdx].stages[stIdx] = stage;
      return next;
    });
  };

  const updateProduct = (sIdx: number, stIdx: number, pIdx: number, patch: Partial<RecommendedProduct>) => {
    setSections((prev) => {
      if (!prev) return prev;
      const next = [...prev];
      const stage = { ...next[sIdx].stages[stIdx] };
      stage.products = stage.products.map((p, i) => i === pIdx ? { ...p, ...patch } : p);
      next[sIdx] = { ...next[sIdx], stages: [...next[sIdx].stages] };
      next[sIdx].stages[stIdx] = stage;
      return next;
    });
  };

  const addAnimalType = (type: string) => {
    const stageNames = DEFAULT_STAGES[type as ProtocolAnimalType] || [];
    const newSection: AnimalSection = {
      animal_class: type,
      estimated_head_count: null,
      expanded: true,
      stages: stageNames.map((name) => ({
        event_name: name,
        scheduled_date: null,
        event_status: "upcoming",
        completion_notes: "",
        actual_head_count: null,
        products: [],
        hasData: false,
        expanded: false,
      })),
    };
    setSections((prev) => [...(prev || []), newSection]);
    setAddTypeOpen(false);
  };

  /* ── Copy to current year ── */
  const copyToCurrentYear = async () => {
    if (!clientOpId || !protocolData) return;
    setSaving(true);
    try {
      for (const p of protocolData) {
        const { data: newProto, error: pErr } = await supabase
          .from("assigned_protocols")
          .insert({
            operation_id: vetOpId,
            client_operation_id: clientOpId,
            animal_class: p.animal_class,
            estimated_head_count: p.estimated_head_count,
            protocol_year: CURRENT_YEAR,
            protocol_status: "draft",
          })
          .select("id")
          .single();
        if (pErr) throw pErr;

        for (const ev of (p.events || [])) {
          const newDate = ev.scheduled_date
            ? ev.scheduled_date.replace(/^\d{4}/, String(CURRENT_YEAR))
            : null;
          await supabase
            .from("assigned_protocol_events")
            .insert({
              assigned_protocol_id: newProto.id,
              event_name: ev.event_name,
              scheduled_date: newDate,
              event_status: "upcoming",
              recommended_products: (ev.recommended_products || []) as unknown as Json,
            });
        }
      }
      queryClient.invalidateQueries({ queryKey: ["customer-protocols", clientOpId] });
      queryClient.invalidateQueries({ queryKey: ["protocol-years", clientOpId] });
      setSections(null);
      setSelectedYear(CURRENT_YEAR);
      showToast("success", `Copied to ${CURRENT_YEAR} as draft`);
    } catch (err: any) {
      showToast("error", err.message || "Copy failed");
    } finally {
      setSaving(false);
    }
  };

  /* ── Save ── */
  const handleSave = async (activate: boolean) => {
    if (!sections || !clientOpId) return;
    setSaving(true);
    try {
      for (const section of sections) {
        let protoId = section.id;
        if (!protoId) {
          const { data: newP, error } = await supabase
            .from("assigned_protocols")
            .insert({
              operation_id: vetOpId,
              client_operation_id: clientOpId,
              animal_class: section.animal_class,
              estimated_head_count: section.estimated_head_count,
              protocol_year: selectedYear,
              protocol_status: activate ? "active" : "draft",
            })
            .select("id")
            .single();
          if (error) throw error;
          protoId = newP!.id;
        } else {
          await supabase
            .from("assigned_protocols")
            .update({
              estimated_head_count: section.estimated_head_count,
              protocol_status: activate ? "active" : "draft",
            })
            .eq("id", protoId);
        }

        for (const stage of section.stages) {
          if (!stage.hasData && stage.products.length === 0) continue;

          const recommendedProducts = stage.products.map((p) => ({
            product_id: p.product_id,
            product_name: p.product_name,
            dosage: p.dosage,
            route: p.route,
            notes: p.notes,
          }));

          if (stage.id) {
            await supabase
              .from("assigned_protocol_events")
              .update({
                event_name: stage.event_name,
                scheduled_date: stage.scheduled_date,
                event_status: stage.event_status,
                completion_notes: stage.completion_notes || null,
                actual_head_count: stage.actual_head_count,
                recommended_products: recommendedProducts as unknown as Json,
              })
              .eq("id", stage.id);
          } else {
            await supabase
              .from("assigned_protocol_events")
              .insert({
                assigned_protocol_id: protoId,
                event_name: stage.event_name,
                scheduled_date: stage.scheduled_date,
                event_status: stage.event_status,
                completion_notes: stage.completion_notes || null,
                actual_head_count: stage.actual_head_count,
                recommended_products: recommendedProducts as unknown as Json,
              });
          }
        }
      }

      queryClient.invalidateQueries({ queryKey: ["customer-protocols", clientOpId] });
      setSections(null);
      showToast("success", activate ? "Protocol activated" : "Draft saved");
    } catch (err: any) {
      showToast("error", err.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  /* ── Derived ── */
  const usedTypes = (sections || []).map((s) => s.animal_class);
  const availableTypes = (ANIMAL_TYPE_OPTIONS as readonly string[]).filter((t) => !usedTypes.includes(t));
  const hasSourceData = protocolData && protocolData.length > 0;
  const displaySections = sections || buildSections(protocolData || []);
  const totalEvents = displaySections.reduce((sum, s) => sum + s.stages.filter((st) => st.hasData).length, 0);

  // ── Cost calculator: collect all product IDs, fetch cheapest cost_per_dose ──
  const allProductIds = useMemo(
    () => displaySections.flatMap((s) => s.stages.flatMap((st) => st.products.map((p) => p.product_id))),
    [displaySections]
  );
  const { costs: costMap } = useProductCosts(allProductIds, vetOpId);

  // Grand total across all sections
  const grandTotal = useMemo(() => {
    let total = 0;
    let hasAny = false;
    for (const section of displaySections) {
      const hc = section.estimated_head_count;
      for (const stage of section.stages) {
        for (const prod of stage.products) {
          const c = calcProductCost(costMap.get(prod.product_id), hc);
          if (c != null) { total += c; hasAny = true; }
        }
      }
    }
    return hasAny ? total : null;
  }, [displaySections, costMap]);

  const canGoLeft = availableYears && availableYears.indexOf(selectedYear) > 0;
  const canGoRight = availableYears && availableYears.indexOf(selectedYear) < availableYears.length - 1;

  return (
    <div className="px-4 pt-1 pb-28 space-y-3" style={{ minHeight: "100%" }}>
      {/* Back + Customer Name */}
      <div className="flex items-center gap-2">
        <button onClick={() => navigate("/protocols")} className="p-1 -ml-1 active:scale-90">
          <ChevronLeft size={22} style={{ color: COLORS.navy }} />
        </button>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: COLORS.textOnLight }} className="truncate">
          {customer?.name || "Customer"}
        </h1>
      </div>

      {/* Year selector */}
      <div className="flex items-center justify-center gap-4">
        <button
          onClick={() => canGoLeft && changeYear(availableYears![availableYears!.indexOf(selectedYear) - 1])}
          disabled={!canGoLeft}
          className="p-2 rounded-full active:scale-90 disabled:opacity-30"
        >
          <ChevronLeft size={20} style={{ color: COLORS.navy }} />
        </button>
        <span style={{ fontSize: 16, fontWeight: 700, color: COLORS.textOnLight }}>
          {selectedYear} Program
        </span>
        <button
          onClick={() => canGoRight && changeYear(availableYears![availableYears!.indexOf(selectedYear) + 1])}
          disabled={!canGoRight}
          className="p-2 rounded-full active:scale-90 disabled:opacity-30"
        >
          <ChevronRight size={20} style={{ color: COLORS.navy }} />
        </button>
      </div>

      {/* Banner */}
      {!isCurrentYear && hasSourceData && (
        <div
          className="rounded-lg px-4 py-3 flex items-center justify-between gap-3"
          style={{ backgroundColor: "rgba(243,209,42,0.15)", border: "1px solid rgba(243,209,42,0.40)" }}
        >
          <span style={{ fontSize: 14, fontWeight: 600, color: COLORS.textOnLight }}>
            Viewing {selectedYear} program
          </span>
          <button
            onClick={copyToCurrentYear}
            disabled={saving}
            className="rounded-full px-4 py-1.5 text-sm font-bold active:scale-95 transition-all"
            style={{ backgroundColor: COLORS.gold, color: COLORS.textOnLight }}
          >
            <Copy size={14} className="inline mr-1.5 -mt-0.5" />
            Copy to {CURRENT_YEAR}
          </button>
        </div>
      )}
      {isCurrentYear && hasSourceData && (
        <div
          className="rounded-lg px-4 py-3"
          style={{ backgroundColor: "rgba(85,186,170,0.12)", border: "1px solid rgba(85,186,170,0.30)" }}
        >
          <span style={{ fontSize: 14, fontWeight: 600, color: COLORS.teal }}>
            {selectedYear} Draft — {totalEvents} event{totalEvents !== 1 ? "s" : ""} scheduled
          </span>
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 rounded-lg" style={{ backgroundColor: "rgba(14,38,70,0.08)" }} />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && displaySections.length === 0 && (
        <div className="py-16 text-center space-y-3">
          <div style={{ fontSize: 15, fontWeight: 600, color: "rgba(26,26,26,0.40)" }}>
            No protocol data for {selectedYear}
          </div>
          {isCurrentYear && (
            <button
              onClick={() => setAddTypeOpen(true)}
              className="rounded-full px-5 py-2.5 active:scale-95 text-sm font-bold transition-all"
              style={{ backgroundColor: COLORS.gold, color: COLORS.textOnLight }}
            >
              + Start Building
            </button>
          )}
        </div>
      )}

      {/* ── Animal Type Sections ── */}
      {!isLoading && displaySections.map((section, sIdx) => {
        const badge = CLASS_BADGE_COLORS[section.animal_class] || CLASS_BADGE_COLORS.Feeder;
        const filledStages = section.stages.filter((s) => s.hasData);
        return (
          <div key={section.animal_class} className="rounded-lg bg-white overflow-hidden shadow-sm" style={{ border: `1px solid ${COLORS.borderDivider}` }}>
            {/* Section header */}
            <button
              className="w-full flex items-center justify-between px-4 py-3 active:bg-gray-50 transition-colors"
              onClick={() => setSections((prev) => {
                if (!prev) return prev;
                const next = [...prev];
                next[sIdx] = { ...next[sIdx], expanded: !next[sIdx].expanded };
                return next;
              })}
            >
              <div className="flex items-center gap-2.5">
                <span style={{ fontSize: 16, fontWeight: 700, color: COLORS.textOnLight }}>
                  {section.animal_class}
                </span>
                {section.estimated_head_count && (
                  <span className="rounded-full px-2 py-0.5" style={{ fontSize: 11, fontWeight: 600, backgroundColor: badge.bg, color: badge.text }}>
                    {section.estimated_head_count} hd
                  </span>
                )}
                <span style={{ fontSize: 12, color: COLORS.mutedText }}>
                  {filledStages.length} / {section.stages.length} stages
                </span>
              </div>
              {section.expanded ? <ChevronUp size={18} style={{ color: COLORS.mutedText }} /> : <ChevronDown size={18} style={{ color: COLORS.mutedText }} />}
            </button>

            {/* Stages */}
            {section.expanded && (
              <div className="px-4 pb-4">
                {/* Head count input (edit mode) */}
                {isDraft && (
                  <div className="flex items-center gap-2 mb-3">
                    <label style={{ fontSize: 13, fontWeight: 600, color: COLORS.mutedText }}>Head Count</label>
                    <input
                      className={INPUT_CLS}
                      style={{ width: 90 }}
                      type="number"
                      placeholder="—"
                      value={section.estimated_head_count ?? ""}
                      onChange={(e) => setSections((prev) => {
                        if (!prev) return prev;
                        const next = [...prev];
                        next[sIdx] = { ...next[sIdx], estimated_head_count: e.target.value ? parseInt(e.target.value) : null };
                        return next;
                      })}
                    />
                  </div>
                )}

                {section.stages.map((stage, stIdx) => {
                  const timingLabel = STAGE_TIMING_HINTS[stage.event_name];
                  return (
                    <div key={stage.event_name}>
                      {/* Timing connector */}
                      {stIdx > 0 && (
                        <div className="flex items-center gap-2 py-1.5 pl-3">
                          <div style={{ width: 1, height: 20, backgroundColor: COLORS.borderDivider }} />
                          {timingLabel && (
                            <span style={{ fontSize: 11, color: COLORS.mutedText, fontWeight: 500 }}>{timingLabel}</span>
                          )}
                        </div>
                      )}

                      {/* Stage Card */}
                      <div
                        className="rounded-lg overflow-hidden"
                        style={{
                          border: `1px solid ${COLORS.borderDivider}`,
                          borderLeft: stage.hasData || stage.products.length > 0
                            ? `4px solid ${COLORS.teal}`
                            : `4px dashed ${COLORS.borderDivider}`,
                        }}
                      >
                        {/* Stage header */}
                        <button
                          className="w-full flex items-center justify-between px-3 py-2.5 active:bg-gray-50 transition-colors"
                          onClick={() => updateStage(sIdx, stIdx, { expanded: !stage.expanded })}
                          style={{ minHeight: 44 }}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span style={{
                                fontSize: 14,
                                fontWeight: 600,
                                color: stage.hasData ? COLORS.textOnLight : COLORS.mutedText,
                              }} className="truncate">
                                {stage.event_name}
                              </span>
                            </div>
                            {!stage.hasData && stage.products.length === 0 && (
                              <span style={{ fontSize: 12, color: COLORS.mutedText }}>No event scheduled</span>
                            )}
                            {stage.scheduled_date && (
                              <span style={{ fontSize: 12, color: COLORS.mutedText }}>{stage.scheduled_date}</span>
                            )}
                          </div>
                          {stage.actual_head_count != null && stage.actual_head_count > 0 && (
                            <span className="rounded-full px-2 py-0.5 shrink-0 mr-2" style={{ fontSize: 10, fontWeight: 600, backgroundColor: "rgba(85,186,170,0.12)", color: COLORS.teal }}>
                              {stage.actual_head_count} hd
                            </span>
                          )}
                          {stage.products.length > 0 && (
                            <span style={{ fontSize: 11, color: COLORS.mutedText, marginRight: 8 }}>
                              {stage.products.length} product{stage.products.length !== 1 ? "s" : ""}
                            </span>
                          )}
                          {stage.expanded
                            ? <ChevronUp size={16} style={{ color: COLORS.mutedText }} />
                            : <ChevronDown size={16} style={{ color: COLORS.mutedText }} />
                          }
                        </button>

                        {/* Expanded content */}
                        {stage.expanded && (
                          <div style={{ borderTop: `1px solid ${COLORS.borderDivider}` }}>
                            {/* Date + head count row in edit mode */}
                            {isDraft && (
                              <div className="flex items-center gap-2 px-3 py-2">
                                <label style={{ fontSize: 12, fontWeight: 600, color: COLORS.mutedText }}>Date</label>
                                <input
                                  type="date"
                                  className={INPUT_CLS}
                                  style={{ width: 140, fontSize: 14 }}
                                  value={stage.scheduled_date || ""}
                                  onChange={(e) => updateStage(sIdx, stIdx, { scheduled_date: e.target.value || null })}
                                />
                                <label style={{ fontSize: 12, fontWeight: 600, color: COLORS.mutedText, marginLeft: 8 }}>Hd</label>
                                <input
                                  type="number"
                                  className={INPUT_CLS}
                                  style={{ width: 60, fontSize: 14 }}
                                  placeholder="—"
                                  value={stage.actual_head_count ?? ""}
                                  onChange={(e) => updateStage(sIdx, stIdx, { actual_head_count: e.target.value ? parseInt(e.target.value) : null })}
                                />
                              </div>
                            )}

                            {/* Product list */}
                            {stage.products.length > 0 && (
                              <div>
                                {stage.products.map((prod, pIdx) => {
                                  const prodCost = calcProductCost(costMap.get(prod.product_id), section.estimated_head_count);
                                  return (
                                  <div
                                    key={pIdx}
                                    className="flex items-center gap-2 px-3 py-2"
                                    style={{ backgroundColor: pIdx % 2 === 1 ? COLORS.background : "white", minHeight: 40 }}
                                  >
                                    <span className="flex-1 min-w-0 truncate" style={{ fontSize: 13, fontWeight: 600, color: COLORS.textOnLight }}>
                                      {prod.product_name}
                                    </span>
                                    {prod.route && (
                                      isDraft ? (
                                        <select
                                          value={prod.route}
                                          onChange={(e) => updateProduct(sIdx, stIdx, pIdx, { route: e.target.value })}
                                          className="rounded-full px-2 py-0.5 shrink-0 text-center appearance-none cursor-pointer"
                                          style={{ fontSize: 10, fontWeight: 600, backgroundColor: "rgba(14,38,70,0.08)", color: COLORS.navy, border: "none", outline: "none" }}
                                        >
                                          {["SubQ", "IM", "IV", "Oral", "Topical", "Pour-On"].map((r) => (
                                            <option key={r} value={r}>{r}</option>
                                          ))}
                                        </select>
                                      ) : (
                                        <span className="rounded-full px-2 py-0.5 shrink-0" style={{ fontSize: 10, fontWeight: 600, backgroundColor: "rgba(14,38,70,0.08)", color: COLORS.navy }}>
                                          {prod.route}
                                        </span>
                                      )
                                    )}
                                    {isDraft ? (
                                      <input
                                        className="shrink-0 bg-transparent outline-none text-right"
                                        style={{ fontSize: 11, color: COLORS.mutedText, width: 60 }}
                                        placeholder="Dosage"
                                        value={prod.dosage || ""}
                                        onChange={(e) => updateProduct(sIdx, stIdx, pIdx, { dosage: e.target.value || null })}
                                      />
                                    ) : (
                                      prod.dosage && (
                                        <span className="shrink-0" style={{ fontSize: 11, color: COLORS.mutedText }}>{prod.dosage}</span>
                                      )
                                    )}
                                    {prodCost != null && (
                                      <span className="shrink-0 text-right" style={{ fontSize: 11, fontWeight: 600, color: COLORS.teal, minWidth: 48 }}>
                                        {formatCost(prodCost)}
                                      </span>
                                    )}
                                    {prod.notes && !isDraft && !prodCost && (
                                      <span className="shrink-0" style={{ fontSize: 11, color: COLORS.mutedText }}>{prod.notes}</span>
                                    )}
                                    {isDraft && (
                                      <button onClick={() => removeProduct(sIdx, stIdx, pIdx)} className="shrink-0 p-0.5 rounded active:scale-90">
                                        <X size={14} style={{ color: COLORS.mutedText }} />
                                      </button>
                                    )}
                                  </div>
                                  );
                                })}
                                {/* Stage cost subtotal */}
                                {(() => {
                                  const stageCost = stage.products.reduce((sum, p) => {
                                    const c = calcProductCost(costMap.get(p.product_id), section.estimated_head_count);
                                    return c != null ? sum + c : sum;
                                  }, 0);
                                  return stageCost > 0 ? (
                                    <div
                                      className="flex items-center justify-between px-3 py-1.5"
                                      style={{ borderTop: `1px solid ${COLORS.borderDivider}`, backgroundColor: "#FAFAF8" }}
                                    >
                                      <span style={{ fontSize: 11, fontWeight: 600, color: COLORS.mutedText }}>
                                        Stage cost ({section.estimated_head_count || 0} hd)
                                      </span>
                                      <span style={{ fontSize: 12, fontWeight: 700, color: COLORS.teal }}>
                                        {formatCost(stageCost)}
                                      </span>
                                    </div>
                                  ) : null;
                                })()}
                              </div>
                            )}

                            {/* Add Product + Notes */}
                            <div className="px-3 py-2 space-y-2">
                              {isDraft && (
                                <button
                                  onClick={() => setProductModal({ sectionIdx: sIdx, stageIdx: stIdx })}
                                  className="text-sm font-semibold active:scale-95 transition-all"
                                  style={{ color: COLORS.teal, minHeight: 44, display: "flex", alignItems: "center", gap: 4 }}
                                >
                                  <Plus size={14} /> Add Product
                                </button>
                              )}
                              {(stage.completion_notes || isDraft) && (
                                <div className="rounded-lg px-3 py-2" style={{ backgroundColor: COLORS.background }}>
                                  {isDraft ? (
                                    <textarea
                                      className="w-full bg-transparent outline-none resize-none"
                                      style={{ fontSize: 13, color: COLORS.textOnLight, minHeight: 32 }}
                                      placeholder="Notes…"
                                      value={stage.completion_notes}
                                      onChange={(e) => updateStage(sIdx, stIdx, { completion_notes: e.target.value })}
                                    />
                                  ) : (
                                    <p style={{ fontSize: 13, color: COLORS.mutedText }}>{stage.completion_notes}</p>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Add Event button for empty stages */}
                        {!stage.expanded && !stage.hasData && stage.products.length === 0 && isDraft && (
                          <div className="px-3 pb-2">
                            <button
                              onClick={() => updateStage(sIdx, stIdx, { expanded: true, hasData: true })}
                              className="text-sm font-semibold active:scale-95"
                              style={{ color: COLORS.teal, minHeight: 44, display: "flex", alignItems: "center", gap: 4 }}
                            >
                              <Plus size={14} /> Add Event
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      {/* Add Animal Type */}
      {isDraft && !isLoading && availableTypes.length > 0 && (
        <div className="relative">
          <button
            onClick={() => setAddTypeOpen(!addTypeOpen)}
            className="w-full rounded-full py-2.5 text-sm font-bold active:scale-[0.98] transition-all"
            style={{
              border: `2px solid ${COLORS.gold}`,
              color: COLORS.textOnLight,
              backgroundColor: "transparent",
            }}
          >
            + Add Animal Type
          </button>
          {addTypeOpen && (
            <div className="absolute top-full mt-1 left-0 right-0 z-20 rounded-lg bg-white shadow-lg overflow-hidden" style={{ border: `1px solid ${COLORS.borderDivider}` }}>
              {availableTypes.map((type) => (
                <button
                  key={type}
                  onClick={() => addAnimalType(type)}
                  className="w-full text-left px-4 py-3 hover:bg-gray-50 active:bg-gray-100 transition-colors"
                  style={{ fontSize: 14, fontWeight: 600, color: COLORS.textOnLight, minHeight: 44 }}
                >
                  {type}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Product Search Modal */}
      <ProductSearchModal
        open={!!productModal}
        onClose={() => setProductModal(null)}
        onSelect={(p) => {
          if (productModal) addProduct(productModal.sectionIdx, productModal.stageIdx, p);
        }}
        excludeIds={
          productModal
            ? (sections || [])[productModal.sectionIdx]?.stages[productModal.stageIdx]?.products.map((p) => p.product_id) || []
            : []
        }
      />

      {/* ── Grand Total Cost Estimate ── */}
      {!isLoading && displaySections.length > 0 && grandTotal != null && (
        <div
          className="rounded-lg overflow-hidden"
          style={{ border: `1px solid ${COLORS.borderDivider}`, backgroundColor: "white" }}
        >
          <div
            className="flex items-center justify-between px-4 py-3"
            style={{ borderLeft: `4px solid ${COLORS.gold}` }}
          >
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: COLORS.textOnLight }}>
                Estimated Total Cost
              </div>
              <div style={{ fontSize: 11, color: COLORS.mutedText }}>
                Based on cheapest available size per product
              </div>
            </div>
            <div style={{ fontSize: 18, fontWeight: 700, color: COLORS.teal }}>
              {formatCost(grandTotal)}
            </div>
          </div>
        </div>
      )}

      {/* ── Bottom Action Bar ── */}
      {isDraft && !isLoading && displaySections.length > 0 && (
        <div
          className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-center gap-3 px-4 py-3 bg-white"
          style={{ borderTop: `1px solid ${COLORS.borderDivider}`, boxShadow: "0 -2px 10px rgba(0,0,0,0.06)" }}
        >
          <button
            onClick={() => handleSave(false)}
            disabled={saving}
            className="rounded-full px-5 py-2.5 text-sm font-bold active:scale-95 transition-all disabled:opacity-50"
            style={{ border: `2px solid ${COLORS.navy}`, color: COLORS.navy, backgroundColor: "transparent" }}
          >
            Save Draft
          </button>
          <button
            onClick={() => handleSave(true)}
            disabled={saving}
            className="rounded-full px-5 py-2.5 text-sm font-bold active:scale-95 transition-all disabled:opacity-50"
            style={{ backgroundColor: COLORS.gold, color: COLORS.textOnLight, boxShadow: "0 2px 10px rgba(243,209,42,0.35)" }}
          >
            Activate
          </button>
          <button
            onClick={() => {
              if (!sections || !customer) return;
              const pdfSections = (sections || [])
                .filter(s => s.stages.some(st => st.products.length > 0))
                .map(s => ({
                  animal_class: s.animal_class,
                  estimated_head_count: s.estimated_head_count,
                  stages: s.stages
                    .filter(st => st.products.length > 0 || st.hasData)
                    .map(st => ({
                      event_name: st.event_name,
                      scheduled_date: st.scheduled_date,
                      event_status: st.event_status,
                      recommended_products: st.products.map(p => ({
                        product_name: p.product_name,
                        dosage: p.dosage,
                        route: p.route,
                        notes: p.notes,
                      })),
                      completion_notes: st.completion_notes,
                      actual_head_count: st.actual_head_count,
                    })),
                }));
              generateProtocolPDF({
                customerName: customer.name,
                practiceName: operationName,
                year: selectedYear,
                sections: pdfSections,
              });
              showToast("success", "PDF downloaded");
            }}
            className="rounded-full px-5 py-2.5 text-sm font-bold transition-all active:scale-95"
            style={{ border: `2px solid ${COLORS.navy}`, color: COLORS.navy, backgroundColor: "transparent" }}
          >
            <FileText size={14} className="inline mr-1 -mt-0.5" />
            PDF
          </button>
        </div>
      )}

      {/* PDF button for non-draft views (past years / activated protocols) */}
      {!isDraft && !isLoading && displaySections.length > 0 && (
        <div
          className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-center gap-3 px-4 py-3 bg-white"
          style={{ borderTop: `1px solid ${COLORS.borderDivider}`, boxShadow: "0 -2px 10px rgba(0,0,0,0.06)" }}
        >
          <button
            onClick={() => {
              if (!sections || !customer) return;
              const pdfSections = (sections || [])
                .filter(s => s.stages.some(st => st.products.length > 0))
                .map(s => ({
                  animal_class: s.animal_class,
                  estimated_head_count: s.estimated_head_count,
                  stages: s.stages
                    .filter(st => st.products.length > 0 || st.hasData)
                    .map(st => ({
                      event_name: st.event_name,
                      scheduled_date: st.scheduled_date,
                      event_status: st.event_status,
                      recommended_products: st.products.map(p => ({
                        product_name: p.product_name,
                        dosage: p.dosage,
                        route: p.route,
                        notes: p.notes,
                      })),
                      completion_notes: st.completion_notes,
                      actual_head_count: st.actual_head_count,
                    })),
                }));
              generateProtocolPDF({
                customerName: customer.name,
                practiceName: operationName,
                year: selectedYear,
                sections: pdfSections,
              });
              showToast("success", "PDF downloaded");
            }}
            className="rounded-full px-6 py-2.5 text-sm font-bold transition-all active:scale-95"
            style={{ backgroundColor: COLORS.navy, color: COLORS.white }}
          >
            <FileText size={14} className="inline mr-1.5 -mt-0.5" />
            Download PDF
          </button>
        </div>
      )}
    </div>
  );
}
