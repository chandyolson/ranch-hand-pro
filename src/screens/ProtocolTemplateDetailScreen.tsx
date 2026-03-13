import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOperation } from "@/contexts/OperationContext";
import { useChuteSideToast } from "@/components/ToastContext";
import { COLORS } from "@/lib/constants";
import { Skeleton } from "@/components/ui/skeleton";
import { MoreVertical, Trash2 } from "lucide-react";

const CLASS_BADGES: Record<string, { bg: string; text: string }> = {
  Calf:        { bg: "rgba(85,186,170,0.12)",  text: "#55BAAA" },
  Replacement: { bg: "rgba(232,116,97,0.12)",  text: "#E87461" },
  Cow:         { bg: "rgba(14,38,70,0.12)",     text: "#0E2646" },
  Bull:        { bg: "rgba(243,209,42,0.12)",   text: "#B8860B" },
  Feeder:      { bg: "rgba(168,168,168,0.12)",  text: "#888888" },
};

export default function ProtocolTemplateDetailScreen() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { operationId } = useOperation();
  const queryClient = useQueryClient();
  const { showToast } = useChuteSideToast();
  const [menuOpen, setMenuOpen] = useState(false);

  const { data: template, isLoading } = useQuery({
    queryKey: ["protocol-template-detail", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vaccination_protocol_templates")
        .select("*")
        .eq("id", id!)
        .single();
      if (error) throw error;

      const { data: events, error: evtErr } = await supabase
        .from("protocol_template_events")
        .select("*, products:protocol_event_products(*, product:products(name, route, dosage, product_type))")
        .eq("template_id", id!)
        .order("event_order", { ascending: true });
      if (evtErr) throw evtErr;

      return { ...data, events: events || [] };
    },
    enabled: !!id,
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      // Delete products, events, then template
      const eventIds = (template?.events || []).map((e: any) => e.id);
      if (eventIds.length > 0) {
        await supabase.from("protocol_event_products").delete().in("event_id", eventIds);
        await supabase.from("protocol_template_events").delete().eq("template_id", id!);
      }
      const { error } = await supabase.from("vaccination_protocol_templates").delete().eq("id", id!);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["protocol-hub-templates"] });
      navigate("/protocols");
    },
  });

  if (isLoading) {
    return (
      <div className="px-4 pt-4 space-y-3">
        <Skeleton className="h-8 w-48" style={{ backgroundColor: "rgba(14,38,70,0.08)" }} />
        <Skeleton className="h-20 w-full" style={{ backgroundColor: "rgba(14,38,70,0.08)" }} />
        <Skeleton className="h-32 w-full" style={{ backgroundColor: "rgba(14,38,70,0.08)" }} />
      </div>
    );
  }

  if (!template) {
    return (
      <div className="px-4 pt-8 text-center" style={{ color: COLORS.mutedText, fontSize: 15 }}>
        Template not found.
      </div>
    );
  }

  const badge = CLASS_BADGES[template.animal_class] || CLASS_BADGES.Feeder;

  return (
    <div className="px-4 pt-1 pb-28 space-y-4" style={{ minHeight: "100%" }}>
      {/* Back */}
      <button
        onClick={() => navigate("/protocols")}
        className="text-sm active:opacity-70"
        style={{ color: COLORS.mutedText }}
      >
        ← Back to Protocols
      </button>

      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: COLORS.textOnLight, lineHeight: 1.3 }}>
            {template.name}
          </h1>
          <div className="flex items-center gap-2 mt-1.5">
            <span
              className="rounded-full px-2.5 py-0.5"
              style={{ fontSize: 12, fontWeight: 600, backgroundColor: badge.bg, color: badge.text }}
            >
              {template.animal_class}
            </span>
            <span
              className="rounded-full px-2.5 py-0.5"
              style={{
                fontSize: 11, fontWeight: 600,
                backgroundColor: template.is_active !== false ? "rgba(85,186,170,0.12)" : "rgba(168,168,168,0.12)",
                color: template.is_active !== false ? "#55BAAA" : "#888",
              }}
            >
              {template.is_active !== false ? "Active" : "Inactive"}
            </span>
          </div>
          {template.description && (
            <p className="mt-2" style={{ fontSize: 13, color: COLORS.mutedText }}>{template.description}</p>
          )}
        </div>

        {/* Three-dot menu */}
        <div className="relative">
          <button
            onClick={() => setMenuOpen((o) => !o)}
            className="p-1.5 rounded-full hover:bg-gray-100 active:bg-gray-200"
          >
            <MoreVertical size={18} style={{ color: COLORS.mutedText }} />
          </button>
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
              <div
                className="absolute right-0 top-full mt-1 z-50 rounded-lg shadow-lg overflow-hidden"
                style={{ backgroundColor: COLORS.white, border: `1px solid ${COLORS.borderDivider}`, minWidth: 160 }}
              >
                <button
                  className="w-full text-left px-4 py-3 hover:bg-gray-50 active:bg-gray-100 flex items-center gap-2"
                  style={{ fontSize: 14, fontWeight: 600, color: COLORS.destructiveRed }}
                  onClick={() => {
                    setMenuOpen(false);
                    if (confirm("Delete this template?")) deleteMutation.mutate();
                  }}
                >
                  <Trash2 size={14} />
                  Delete Template
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Stage Cards */}
      <div className="space-y-3">
        <div style={{ fontSize: 13, fontWeight: 700, color: COLORS.mutedText, letterSpacing: "0.05em", textTransform: "uppercase" }}>
          Stages ({template.events.length})
        </div>
        {template.events.map((evt: any, i: number) => (
          <div
            key={evt.id}
            className="rounded-lg bg-white shadow-sm overflow-hidden"
            style={{ border: `1px solid ${COLORS.borderDivider}`, borderLeft: `4px solid ${COLORS.teal}` }}
          >
            <div className="px-3 py-2.5 flex items-center justify-between">
              <span style={{ fontSize: 15, fontWeight: 700, color: COLORS.textOnLight }}>{evt.event_name}</span>
              <span
                className="rounded-full px-2 py-0.5"
                style={{ fontSize: 10, fontWeight: 600, backgroundColor: "rgba(14,38,70,0.06)", color: COLORS.mutedText }}
              >
                Stage {i + 1}
              </span>
            </div>
            {evt.products && evt.products.length > 0 && (
              <div style={{ borderTop: `1px solid ${COLORS.borderDivider}` }}>
                {evt.products.map((ep: any, pi: number) => {
                  const prod = ep.product;
                  return (
                    <div
                      key={ep.id}
                      className="flex items-center gap-2 px-3 py-2"
                      style={{ backgroundColor: pi % 2 === 1 ? "#F5F5F0" : "white" }}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="truncate" style={{ fontSize: 13, fontWeight: 600, color: COLORS.textOnLight }}>
                          {prod?.name || "Unknown Product"}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          {(ep.route_override || prod?.route) && (
                            <span
                              className="rounded-full px-2 py-0.5"
                              style={{ fontSize: 10, fontWeight: 600, backgroundColor: "rgba(14,38,70,0.08)", color: COLORS.navy }}
                            >
                              {ep.route_override || prod?.route}
                            </span>
                          )}
                          {(ep.dosage_override || prod?.dosage) && (
                            <span style={{ fontSize: 11, color: COLORS.mutedText }}>
                              {ep.dosage_override || prod?.dosage}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            {(!evt.products || evt.products.length === 0) && (
              <div className="px-3 py-2" style={{ borderTop: `1px solid ${COLORS.borderDivider}`, fontSize: 12, color: COLORS.mutedText }}>
                No products assigned
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Bottom Action Bar */}
      <div
        className="fixed bottom-0 left-0 right-0 px-4 py-3 flex gap-3 z-40"
        style={{ backgroundColor: COLORS.white, borderTop: `1px solid ${COLORS.borderDivider}` }}
      >
        <button
          onClick={() => navigate(`/protocols/templates/new?edit=${id}`)}
          className="flex-1 rounded-lg py-2.5 font-semibold text-sm active:scale-[0.98] transition-all"
          style={{ border: `2px solid ${COLORS.navy}`, color: COLORS.navy, backgroundColor: "transparent", minHeight: 44 }}
        >
          Edit
        </button>
        <button
          onClick={() => showToast("Assign to Customer — coming soon", "info")}
          className="flex-1 rounded-lg py-2.5 font-semibold text-sm active:scale-[0.98] transition-all"
          style={{ backgroundColor: COLORS.gold, color: COLORS.textOnLight, minHeight: 44 }}
        >
          Assign to Customer
        </button>
      </div>
    </div>
  );
}
