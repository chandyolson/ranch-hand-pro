import { useState, useCallback, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
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

/* ── Stage reference map ── */
const STAGE_MAP: Record<string, string[]> = {
  Calf: ["Birth / Calving", "Branding", "Preconditioning", "Weaning"],
  Replacement: ["Bangs / Pre-Breeding", "Pre-Breeding", "Breeding / AI", "Pregnancy Check", "Pre-Calving"],
  Cow: ["Pre-Calving", "Pre-Breeding", "Breeding / AI", "Fall Preg Check"],
  Bull: ["BSE / Pre-Turnout", "Fall Check"],
  Feeder: ["Arrival Processing", "Booster"],
};

const TIMING_LABELS: Record<string, Record<string, string>> = {
  Calf: { "Branding": "~90 days", "Preconditioning": "~120 days", "Weaning": "~60 days" },
  Replacement: { "Pre-Breeding": "~60 days", "Breeding / AI": "~30 days", "Pregnancy Check": "~60 days", "Pre-Calving": "~120 days" },
  Cow: { "Pre-Breeding": "~60 days", "Breeding / AI": "~30 days", "Fall Preg Check": "~120 days" },
  Bull: { "Fall Check": "~180 days" },
  Feeder: { "Booster": "~21 days" },
};

const CLASS_BADGES: Record<string, { bg: string; text: string }> = {
  Calf: { bg: "rgba(85,186,170,0.12)", text: "#55BAAA" },
  Cow: { bg: "rgba(14,38,70,0.12)", text: "#0E2646" },
  Replacement: { bg: "rgba(232,116,97,0.12)", text: "#E87461" },
  Bull: { bg: "rgba(243,209,42,0.12)", text: "#B8860B" },
  Feeder: { bg: "rgba(168,168,168,0.12)", text: "#888888" },
};

interface EventProduct {
  id?: string;
  product_id: string;
  name: string;
  route: string | null;
  dosage: string | null;
  injection_site: string | null;
  included: boolean;
}

interface StageData {
  id?: string;
  event_name: string;
  scheduled_date: string | null;
  event_status: string;
  notes: string;
  products: EventProduct[];
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
  const { operationId: vetOpId } = useOperation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { showToast } = useChuteSideToast();

  const [selectedYear, setSelectedYear] = useState(CURRENT_YEAR);
  const [sections, setSections] = useState<AnimalSection[] | null>(null);
  const [productModal, setProductModal] = useState<{ sectionIdx: number; stageIdx: number } | null>(null);
  const [saving, setSaving] = useState(false);
  const [addTypeOpen, setAddTypeOpen] = useState(false);

  const isCurrentYear = selectedYear === CURRENT_YEAR;
  const isDraft = isCurrentYear; // simplified: current year = editable

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
      const years = [...new Set((data || []).map((d: any) => d.protocol_year).filter(Boolean))] as number[];
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
            template_event_id
          )
        `)
        .eq("client_operation_id", clientOpId!)
        .eq("protocol_year", selectedYear);
      if (error) throw error;

      // Fetch products for all events
      const eventIds = (protocols || []).flatMap((p: any) =>
        (p.events || []).map((e: any) => e.template_event_id).filter(Boolean)
      );
      const assignedEventIds = (protocols || []).flatMap((p: any) =>
        (p.events || []).map((e: any) => e.id)
      );

      let eventProducts: any[] = [];
      if (eventIds.length > 0) {
        const { data: ep } = await supabase
          .from("protocol_event_products")
          .select("id, event_id, product_id, dosage_override, route_override, injection_site, product:products(name, route, dosage, injection_site)")
          .in("event_id", [...eventIds, ...assignedEventIds]);
        eventProducts = ep || [];
      }

      return { protocols: protocols || [], eventProducts };
    },
    enabled: !!clientOpId,
  });

  /* ── Build sections from data ── */
  const buildSections = useCallback((data: typeof protocolData): AnimalSection[] => {
    if (!data || data.protocols.length === 0) return [];

    return data.protocols.map((p: any) => {
      const stageNames = STAGE_MAP[p.animal_class] || [];
      const eventMap = new Map<string, any>();
      (p.events || []).forEach((e: any) => eventMap.set(e.event_name, e));

      const stages: StageData[] = stageNames.map((stageName) => {
        const ev = eventMap.get(stageName);
        const products: EventProduct[] = ev
          ? data.eventProducts
              .filter((ep: any) => ep.event_id === ev.id || ep.event_id === ev.template_event_id)
              .map((ep: any) => ({
                id: ep.id,
                product_id: ep.product_id,
                name: ep.product?.name || "Unknown",
                route: ep.route_override || ep.product?.route || null,
                dosage: ep.dosage_override || ep.product?.dosage || null,
                injection_site: ep.injection_site || ep.product?.injection_site || null,
                included: true,
              }))
          : [];

        return {
          id: ev?.id,
          event_name: stageName,
          scheduled_date: ev?.scheduled_date || null,
          event_status: ev?.event_status || "upcoming",
          notes: ev?.completion_notes || "",
          products,
          hasData: !!ev,
          expanded: !!ev,
        };
      });

      // Add any events not in the reference map
      (p.events || []).forEach((e: any) => {
        if (!stageNames.includes(e.event_name)) {
          const products = data.eventProducts
            .filter((ep: any) => ep.event_id === e.id || ep.event_id === e.template_event_id)
            .map((ep: any) => ({
              id: ep.id,
              product_id: ep.product_id,
              name: ep.product?.name || "Unknown",
              route: ep.route_override || ep.product?.route || null,
              dosage: ep.dosage_override || ep.product?.dosage || null,
              injection_site: ep.injection_site || ep.product?.injection_site || null,
              included: true,
            }));
          stages.push({
            id: e.id,
            event_name: e.event_name,
            scheduled_date: e.scheduled_date,
            event_status: e.event_status || "upcoming",
            notes: e.completion_notes || "",
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

  // Reset sections when year changes
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
        name: product.name,
        route: product.route,
        dosage: product.dosage,
        injection_site: product.injection_site,
        included: true,
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

  const toggleProduct = (sIdx: number, stIdx: number, pIdx: number) => {
    setSections((prev) => {
      if (!prev) return prev;
      const next = [...prev];
      const stage = { ...next[sIdx].stages[stIdx] };
      stage.products = stage.products.map((p, i) => i === pIdx ? { ...p, included: !p.included } : p);
      next[sIdx] = { ...next[sIdx], stages: [...next[sIdx].stages] };
      next[sIdx].stages[stIdx] = stage;
      return next;
    });
  };

  const addAnimalType = (type: string) => {
    const stageNames = STAGE_MAP[type] || [];
    const newSection: AnimalSection = {
      animal_class: type,
      estimated_head_count: null,
      expanded: true,
      stages: stageNames.map((name) => ({
        event_name: name,
        scheduled_date: null,
        event_status: "upcoming",
        notes: "",
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
      for (const p of protocolData.protocols) {
        const { data: newProto, error: pErr } = await supabase
          .from("assigned_protocols")
          .insert({
            template_id: (p as any).template_id || p.id,
            operation_id: vetOpId,
            client_operation_id: clientOpId,
            animal_class: p.animal_class,
            estimated_head_count: p.estimated_head_count,
            protocol_year: CURRENT_YEAR,
            protocol_status: "draft",
          } as any)
          .select("id")
          .single();
        if (pErr) throw pErr;

        for (const ev of (p as any).events || []) {
          const newDate = ev.scheduled_date
            ? ev.scheduled_date.replace(/^\d{4}/, String(CURRENT_YEAR))
            : null;
          const { data: newEv, error: eErr } = await supabase
            .from("assigned_protocol_events")
            .insert({
              assigned_protocol_id: newProto.id,
              event_name: ev.event_name,
              scheduled_date: newDate,
              event_status: "upcoming",
              template_event_id: ev.template_event_id,
            })
            .select("id")
            .single();
          if (eErr) throw eErr;

          const evProducts = protocolData.eventProducts.filter(
            (ep: any) => ep.event_id === ev.id || ep.event_id === ev.template_event_id
          );
          if (evProducts.length > 0) {
            await supabase.from("protocol_event_products").insert(
              evProducts.map((ep: any) => ({
                event_id: newEv.id,
                product_id: ep.product_id,
                dosage_override: ep.dosage_override,
                route_override: ep.route_override,
                injection_site: ep.injection_site,
              }))
            );
          }
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
          // Find an existing template to reference, or use a dummy
          const { data: templates } = await supabase
            .from("vaccination_protocol_templates")
            .select("id")
            .eq("operation_id", vetOpId)
            .limit(1);
          const templateId = templates?.[0]?.id;
          if (!templateId) {
            // Create a minimal template
            const { data: newT } = await supabase
              .from("vaccination_protocol_templates")
              .insert({ name: `${customer?.name} - ${section.animal_class}`, operation_id: vetOpId, animal_class: section.animal_class } as any)
              .select("id")
              .single();
            if (!newT) throw new Error("Failed to create template");
            const { data: newP, error } = await supabase
              .from("assigned_protocols")
              .insert({
                template_id: newT.id,
                operation_id: vetOpId,
                client_operation_id: clientOpId,
                animal_class: section.animal_class,
                estimated_head_count: section.estimated_head_count,
                protocol_year: selectedYear,
                protocol_status: activate ? "active" : "draft",
              } as any)
              .select("id")
              .single();
            if (error) throw error;
            protoId = newP!.id;
          } else {
            const { data: newP, error } = await supabase
              .from("assigned_protocols")
              .insert({
                template_id: templateId,
                operation_id: vetOpId,
                client_operation_id: clientOpId,
                animal_class: section.animal_class,
                estimated_head_count: section.estimated_head_count,
                protocol_year: selectedYear,
                protocol_status: activate ? "active" : "draft",
              } as any)
              .select("id")
              .single();
            if (error) throw error;
            protoId = newP!.id;
          }
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
          let eventId = stage.id;
          if (!eventId) {
            const { data: newEv, error } = await supabase
              .from("assigned_protocol_events")
              .insert({
                assigned_protocol_id: protoId,
                event_name: stage.event_name,
                scheduled_date: stage.scheduled_date,
                event_status: stage.event_status,
                completion_notes: stage.notes || null,
              })
              .select("id")
              .single();
            if (error) throw error;
            eventId = newEv!.id;
          } else {
            await supabase
              .from("assigned_protocol_events")
              .update({
                event_name: stage.event_name,
                scheduled_date: stage.scheduled_date,
                event_status: stage.event_status,
                completion_notes: stage.notes || null,
              })
              .eq("id", eventId);
          }

          // Delete + re-insert products
          await supabase.from("protocol_event_products").delete().eq("event_id", eventId);
          const includedProducts = stage.products.filter((p) => p.included);
          if (includedProducts.length > 0) {
            await supabase.from("protocol_event_products").insert(
              includedProducts.map((p, i) => ({
                event_id: eventId!,
                product_id: p.product_id,
                dosage_override: p.dosage,
                route_override: p.route,
                injection_site: p.injection_site,
                sort_order: i,
              }))
            );
          }
        }
      }

      queryClient.invalidateQueries({ queryKey: ["customer-protocols", clientOpId] });
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
  const hasSourceData = protocolData && protocolData.protocols.length > 0;
  const displaySections = sections || buildSections(protocolData || { protocols: [], eventProducts: [] });
  const totalEvents = displaySections.reduce((sum, s) => sum + s.stages.filter((st) => st.hasData).length, 0);

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
          style={{ backgroundColor: "rgba(243,209,42,0.15)", border: `1px solid rgba(243,209,42,0.40)` }}
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
          style={{ backgroundColor: "rgba(85,186,170,0.12)", border: `1px solid rgba(85,186,170,0.30)` }}
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
        const badge = CLASS_BADGES[section.animal_class] || CLASS_BADGES.Feeder;
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
                  const timingLabel = TIMING_LABELS[section.animal_class]?.[stage.event_name];
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
                            {/* Product table */}
                            {stage.products.length > 0 && (
                              <div>
                                {stage.products.map((prod, pIdx) => (
                                  <div
                                    key={pIdx}
                                    className="flex items-center gap-2 px-3 py-2"
                                    style={{ backgroundColor: pIdx % 2 === 1 ? COLORS.background : "white", minHeight: 40 }}
                                  >
                                    {isDraft && (
                                      <button
                                        onClick={() => toggleProduct(sIdx, stIdx, pIdx)}
                                        className="shrink-0 rounded flex items-center justify-center"
                                        style={{
                                          width: 20, height: 20,
                                          border: `2px solid ${prod.included ? COLORS.teal : COLORS.borderDivider}`,
                                          backgroundColor: prod.included ? COLORS.teal : "transparent",
                                        }}
                                      >
                                        {prod.included && <Check size={12} color="white" />}
                                      </button>
                                    )}
                                    <span className="flex-1 min-w-0 truncate" style={{ fontSize: 13, fontWeight: 600, color: COLORS.textOnLight }}>
                                      {prod.name}
                                    </span>
                                    {prod.route && (
                                      <span className="rounded-full px-2 py-0.5 shrink-0" style={{ fontSize: 10, fontWeight: 600, backgroundColor: "rgba(14,38,70,0.08)", color: COLORS.navy }}>
                                        {prod.route}
                                      </span>
                                    )}
                                    {prod.dosage && (
                                      <span className="shrink-0" style={{ fontSize: 11, color: COLORS.mutedText }}>{prod.dosage}</span>
                                    )}
                                    {prod.injection_site && (
                                      <span className="shrink-0" style={{ fontSize: 11, color: COLORS.mutedText }}>{prod.injection_site}</span>
                                    )}
                                    {isDraft && (
                                      <button onClick={() => removeProduct(sIdx, stIdx, pIdx)} className="shrink-0 p-0.5 rounded active:scale-90">
                                        <X size={14} style={{ color: COLORS.mutedText }} />
                                      </button>
                                    )}
                                  </div>
                                ))}
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
                              {(stage.notes || isDraft) && (
                                <div className="rounded-lg px-3 py-2" style={{ backgroundColor: COLORS.background }}>
                                  {isDraft ? (
                                    <textarea
                                      className="w-full bg-transparent outline-none resize-none"
                                      style={{ fontSize: 13, color: COLORS.textOnLight, minHeight: 32 }}
                                      placeholder="Notes…"
                                      value={stage.notes}
                                      onChange={(e) => updateStage(sIdx, stIdx, { notes: e.target.value })}
                                    />
                                  ) : (
                                    <p style={{ fontSize: 13, color: COLORS.mutedText }}>{stage.notes}</p>
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
            disabled
            className="rounded-full px-5 py-2.5 text-sm font-bold transition-all opacity-50"
            style={{ border: `2px solid ${COLORS.navy}`, color: COLORS.navy, backgroundColor: "transparent" }}
          >
            <FileText size={14} className="inline mr-1 -mt-0.5" />
            Preview PDF
          </button>
        </div>
      )}
    </div>
  );
}
