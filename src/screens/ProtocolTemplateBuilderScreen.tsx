import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOperation } from "@/contexts/OperationContext";
import { COLORS } from "@/lib/constants";
import { INPUT_CLS } from "@/lib/styles";
import { ChevronDown, Plus, X } from "lucide-react";
import ProductSearchModal, { SelectedProduct } from "@/components/ProductSearchModal";

const ANIMAL_TYPES = ["Calf", "Replacement", "Cow", "Bull", "Feeder"] as const;

const STAGE_MAP: Record<string, string[]> = {
  Calf: ["Birth/Calving", "Branding", "Preconditioning", "Weaning"],
  Replacement: ["Bangs/Pre-Breeding", "Pre-Breeding", "Breeding/AI", "Pregnancy Check", "Pre-Calving"],
  Cow: ["Pre-Calving", "Pre-Breeding", "Breeding/AI", "Fall Preg Check"],
  Bull: ["BSE/Pre-Turnout", "Fall Check"],
  Feeder: ["Arrival Processing", "Booster"],
};

interface StageProduct {
  product_id: string;
  name: string;
  route: string | null;
  dosage: string | null;
  product_type: string;
}

interface Stage {
  name: string;
  products: StageProduct[];
}

export default function ProtocolTemplateBuilderScreen() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get("edit");
  const { operationId } = useOperation();
  const queryClient = useQueryClient();

  const [templateName, setTemplateName] = useState("");
  const [animalType, setAnimalType] = useState("");
  const [stages, setStages] = useState<Stage[]>([]);
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [activeStageIdx, setActiveStageIdx] = useState<number | null>(null);
  const [loaded, setLoaded] = useState(false);

  // Load existing template for edit mode
  const { data: existingTemplate } = useQuery({
    queryKey: ["protocol-template-edit", editId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vaccination_protocol_templates")
        .select("*")
        .eq("id", editId!)
        .single();
      if (error) throw error;

      const { data: events, error: evtErr } = await supabase
        .from("protocol_template_events")
        .select("*, products:protocol_event_products(*, product:products(id, name, route, dosage, product_type))")
        .eq("template_id", editId!)
        .order("event_order", { ascending: true });
      if (evtErr) throw evtErr;

      return { ...data, events: events || [] };
    },
    enabled: !!editId,
  });

  // Populate form from existing template
  useEffect(() => {
    if (existingTemplate && !loaded) {
      setTemplateName(existingTemplate.name || "");
      setAnimalType(existingTemplate.animal_class || "");
      setStages(
        (existingTemplate.events || []).map((evt: any) => ({
          name: evt.event_name,
          products: (evt.products || []).map((ep: any) => ({
            product_id: ep.product?.id || ep.product_id,
            name: ep.product?.name || "Unknown",
            route: ep.route_override || ep.product?.route || null,
            dosage: ep.dosage_override || ep.product?.dosage || null,
            product_type: ep.product?.product_type || "",
          })),
        }))
      );
      setLoaded(true);
    }
  }, [existingTemplate, loaded]);

  const handleAnimalTypeChange = (type: string) => {
    setAnimalType(type);
    const stageNames = STAGE_MAP[type] || [];
    setStages(stageNames.map((name) => ({ name, products: [] })));
  };

  const handleAddProduct = (product: SelectedProduct) => {
    if (activeStageIdx === null) return;
    setStages((prev) =>
      prev.map((s, i) =>
        i === activeStageIdx
          ? { ...s, products: [...s.products, { product_id: product.product_id, name: product.name, route: product.route, dosage: product.dosage, product_type: product.product_type }] }
          : s
      )
    );
  };

  const removeProduct = (stageIdx: number, productIdx: number) => {
    setStages((prev) =>
      prev.map((s, i) =>
        i === stageIdx ? { ...s, products: s.products.filter((_, pi) => pi !== productIdx) } : s
      )
    );
  };

  const updateStageName = (idx: number, name: string) => {
    setStages((prev) => prev.map((s, i) => (i === idx ? { ...s, name } : s)));
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!templateName.trim()) throw new Error("Template name is required");
      if (!animalType) throw new Error("Animal type is required");

      // If editing, delete old events/products then update template
      if (editId) {
        const { data: oldEvents } = await supabase
          .from("protocol_template_events")
          .select("id")
          .eq("template_id", editId);
        const oldEventIds = (oldEvents || []).map((e: any) => e.id);
        if (oldEventIds.length > 0) {
          await supabase.from("protocol_event_products").delete().in("event_id", oldEventIds);
        }
        await supabase.from("protocol_template_events").delete().eq("template_id", editId);

        const { error: updErr } = await supabase
          .from("vaccination_protocol_templates")
          .update({ name: templateName.trim(), animal_class: animalType })
          .eq("id", editId);
        if (updErr) throw updErr;
      }

      const templateId = editId || undefined;

      // If creating new
      let finalId = editId;
      if (!editId) {
        const { data: tmpl, error: tmplErr } = await supabase
          .from("vaccination_protocol_templates")
          .insert({
            name: templateName.trim(),
            animal_class: animalType,
            operation_id: operationId,
            is_active: true,
          })
          .select("id")
          .single();
        if (tmplErr) throw tmplErr;
        finalId = tmpl.id;
      }

      // Insert events + products
      for (let i = 0; i < stages.length; i++) {
        const stage = stages[i];
        const { data: evt, error: evtErr } = await supabase
          .from("protocol_template_events")
          .insert({
            template_id: finalId!,
            event_name: stage.name,
            event_order: i + 1,
            days_offset: 0,
          })
          .select("id")
          .single();
        if (evtErr) throw evtErr;

        if (stage.products.length > 0) {
          const productRows = stage.products.map((p, pi) => ({
            event_id: evt.id,
            product_id: p.product_id,
            dosage_override: p.dosage,
            route_override: p.route,
            sort_order: pi,
          }));
          const { error: prodErr } = await supabase
            .from("protocol_event_products")
            .insert(productRows);
          if (prodErr) throw prodErr;
        }
      }

      return finalId!;
    },
    onSuccess: (id) => {
      queryClient.invalidateQueries({ queryKey: ["protocol-hub-templates"] });
      queryClient.invalidateQueries({ queryKey: ["protocol-template-detail", id] });
      navigate(`/protocols/templates/${id}`);
    },
  });

  const existingProductIds = activeStageIdx !== null
    ? stages[activeStageIdx]?.products.map((p) => p.product_id) || []
    : [];

  const isEdit = !!editId;

  return (
    <div className="px-4 pt-1 pb-28 space-y-4" style={{ minHeight: "100%" }}>
      {/* Header */}
      <div>
        <button
          onClick={() => navigate(isEdit ? `/protocols/templates/${editId}` : "/protocols")}
          className="text-sm mb-2 active:opacity-70"
          style={{ color: COLORS.mutedText }}
        >
          ← {isEdit ? "Back to Template" : "Back to Protocols"}
        </button>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: COLORS.textOnLight }}>
          {isEdit ? "Edit Template" : "New Template"}
        </h1>
      </div>

      {/* Template Name */}
      <div className="space-y-1">
        <label style={{ fontSize: 13, fontWeight: 600, color: COLORS.textOnLight }}>Protocol Name</label>
        <input
          className={INPUT_CLS}
          style={{ width: "100%" }}
          placeholder="e.g., Spring Calf Program"
          value={templateName}
          onChange={(e) => setTemplateName(e.target.value)}
        />
      </div>

      {/* Animal Type */}
      <div className="space-y-1">
        <label style={{ fontSize: 13, fontWeight: 600, color: COLORS.textOnLight }}>Animal Type</label>
        <div className="relative">
          <select
            className={INPUT_CLS}
            style={{ width: "100%", appearance: "none", paddingRight: 32 }}
            value={animalType}
            onChange={(e) => handleAnimalTypeChange(e.target.value)}
          >
            <option value="">Select animal type…</option>
            {ANIMAL_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: COLORS.mutedText }} />
        </div>
      </div>

      {/* Stage Cards */}
      {stages.length > 0 && (
        <div className="space-y-3">
          <div style={{ fontSize: 13, fontWeight: 700, color: COLORS.mutedText, letterSpacing: "0.05em", textTransform: "uppercase" }}>
            Stages
          </div>
          {stages.map((stage, si) => (
            <div
              key={si}
              className="rounded-lg bg-white shadow-sm overflow-hidden"
              style={{ border: `1px solid ${COLORS.borderDivider}`, borderLeft: `4px solid ${COLORS.teal}` }}
            >
              <div className="px-3 py-2.5">
                <input
                  className="w-full bg-transparent outline-none"
                  style={{ fontSize: 15, fontWeight: 700, color: COLORS.textOnLight }}
                  value={stage.name}
                  onChange={(e) => updateStageName(si, e.target.value)}
                />
              </div>

              {stage.products.length > 0 && (
                <div style={{ borderTop: `1px solid ${COLORS.borderDivider}` }}>
                  {stage.products.map((p, pi) => (
                    <div
                      key={pi}
                      className="flex items-center gap-2 px-3 py-2"
                      style={{ backgroundColor: pi % 2 === 1 ? "#F5F5F0" : "white" }}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="truncate" style={{ fontSize: 13, fontWeight: 600, color: COLORS.textOnLight }}>
                          {p.name}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          {p.route && (
                            <span
                              className="rounded-full px-2 py-0.5"
                              style={{ fontSize: 10, fontWeight: 600, backgroundColor: "rgba(14,38,70,0.08)", color: COLORS.navy }}
                            >
                              {p.route}
                            </span>
                          )}
                          {p.dosage && (
                            <span style={{ fontSize: 11, color: COLORS.mutedText }}>{p.dosage}</span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => removeProduct(si, pi)}
                        className="p-1 rounded-full hover:bg-gray-100 active:bg-gray-200 shrink-0"
                      >
                        <X size={14} style={{ color: COLORS.mutedText }} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <button
                className="w-full px-3 py-2 text-left flex items-center gap-1.5 hover:bg-gray-50 active:bg-gray-100 transition-colors"
                style={{ borderTop: `1px solid ${COLORS.borderDivider}`, fontSize: 13, fontWeight: 600, color: COLORS.teal, minHeight: 44 }}
                onClick={() => { setActiveStageIdx(si); setProductModalOpen(true); }}
              >
                <Plus size={14} />
                Add Product
              </button>
            </div>
          ))}
        </div>
      )}

      <ProductSearchModal
        open={productModalOpen}
        onClose={() => { setProductModalOpen(false); setActiveStageIdx(null); }}
        onSelect={handleAddProduct}
        excludeIds={existingProductIds}
      />

      {/* Bottom Bar */}
      {stages.length > 0 && (
        <div
          className="fixed bottom-0 left-0 right-0 px-4 py-3 flex gap-3 z-40"
          style={{ backgroundColor: COLORS.white, borderTop: `1px solid ${COLORS.borderDivider}` }}
        >
          <button
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending || !templateName.trim()}
            className="flex-1 rounded-lg py-2.5 font-semibold text-sm active:scale-[0.98] transition-all disabled:opacity-50"
            style={{ backgroundColor: COLORS.gold, color: COLORS.textOnLight, minHeight: 44 }}
          >
            {saveMutation.isPending ? "Saving…" : isEdit ? "Update Template" : "Save Template"}
          </button>
        </div>
      )}

      {saveMutation.isError && (
        <div className="rounded-lg px-3 py-2" style={{ backgroundColor: "rgba(212,24,61,0.08)", color: COLORS.destructiveRed, fontSize: 13 }}>
          {(saveMutation.error as Error).message}
        </div>
      )}
    </div>
  );
}
