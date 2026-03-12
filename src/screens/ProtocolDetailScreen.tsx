import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOperation } from "@/contexts/OperationContext";
import { useChuteSideToast } from "@/components/ToastContext";
import { Skeleton } from "@/components/ui/skeleton";
import PillButton from "@/components/PillButton";
import { MoreVertical, ChevronLeft } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { useState } from "react";

/* ── Colors matching ProtocolsScreen ── */
const CLASS_COLORS: Record<string, { bg: string; text: string }> = {
  Calves: { bg: "rgba(85,186,170,0.12)", text: "#55BAAA" },
  Cows: { bg: "rgba(243,209,42,0.12)", text: "#B8860B" },
  Bulls: { bg: "rgba(14,38,70,0.12)", text: "#0E2646" },
  Heifers: { bg: "rgba(232,116,97,0.12)", text: "#E87461" },
  Feeders: { bg: "rgba(168,168,168,0.12)", text: "#888888" },
  Calf: { bg: "rgba(85,186,170,0.12)", text: "#55BAAA" },
  Cow: { bg: "rgba(243,209,42,0.12)", text: "#B8860B" },
  Bull: { bg: "rgba(14,38,70,0.12)", text: "#0E2646" },
  Replacement: { bg: "rgba(232,116,97,0.12)", text: "#E87461" },
  Feeder: { bg: "rgba(168,168,168,0.12)", text: "#888888" },
};

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

export default function ProtocolDetailScreen() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { operationId } = useOperation();
  const { showToast } = useChuteSideToast();
  const queryClient = useQueryClient();
  const [deleting, setDeleting] = useState(false);

  /* ── Query: template ── */
  const { data: template, isLoading } = useQuery({
    queryKey: ["protocol-detail", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vaccination_protocol_templates")
        .select("*")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  /* ── Query: events with products ── */
  const { data: events } = useQuery({
    queryKey: ["protocol-detail-events", id],
    queryFn: async () => {
      const { data: evts, error } = await supabase
        .from("protocol_template_events")
        .select("*")
        .eq("template_id", id!)
        .order("event_order");
      if (error) throw error;
      if (!evts || evts.length === 0) return [];

      // Fetch products for all events
      const eventIds = evts.map((e) => e.id);
      const { data: evtProducts } = await supabase
        .from("protocol_event_products")
        .select("*, product:products(name, dosage, route, injection_site, slaughter_withdrawal, milk_withdrawal)")
        .in("event_id", eventIds)
        .order("sort_order");

      // Fetch work types for codes
      const { data: workTypes } = await supabase
        .from("work_types")
        .select("id, code, name");

      const wtMap = new Map((workTypes || []).map((w) => [w.code, w.name]));

      return evts.map((evt) => ({
        ...evt,
        work_type_name: (evt as any).work_type_code ? wtMap.get((evt as any).work_type_code) || (evt as any).work_type_code : null,
        products: (evtProducts || [])
          .filter((p) => p.event_id === evt.id)
          .map((p: any) => ({
            id: p.id,
            name: p.product?.name || "Unknown",
            dosage: p.dosage_override || p.product?.dosage || "—",
            route: p.route_override || p.product?.route || "—",
            injection_site: p.injection_site || p.product?.injection_site || "—",
            withdrawal: p.product?.slaughter_withdrawal || p.product?.milk_withdrawal || "—",
            notes: p.notes || "",
          })),
      }));
    },
    enabled: !!id,
  });

  /* ── Delete ── */
  const handleDelete = async () => {
    if (!window.confirm("Delete this protocol? This cannot be undone.")) return;
    setDeleting(true);
    try {
      // Delete products, events, then template
      const eventIds = (events || []).map((e) => e.id);
      if (eventIds.length) {
        await supabase.from("protocol_event_products").delete().in("event_id", eventIds);
        await supabase.from("protocol_template_events").delete().eq("template_id", id!);
      }
      await supabase.from("vaccination_protocol_templates").delete().eq("id", id!);
      queryClient.invalidateQueries({ queryKey: ["vaccination-protocols"] });
      showToast("success", "Protocol deleted");
      navigate("/protocols");
    } catch {
      showToast("error", "Failed to delete");
    } finally {
      setDeleting(false);
    }
  };

  /* ── Duplicate ── */
  const handleDuplicate = async () => {
    if (!template) return;
    try {
      // Create new template
      const { data: newTpl, error: tplErr } = await supabase
        .from("vaccination_protocol_templates")
        .insert({
          name: `${template.name} (Copy)`,
          animal_class: template.animal_class,
          description: template.description,
          operation_id: operationId,
          is_active: false,
        })
        .select()
        .single();
      if (tplErr || !newTpl) throw tplErr;

      // Copy events
      for (const evt of events || []) {
        const { data: newEvt } = await supabase
          .from("protocol_template_events")
          .insert({
            template_id: newTpl.id,
            event_name: evt.event_name,
            event_order: evt.event_order,
            days_offset: evt.days_offset,
            timing_description: evt.timing_description,
            equipment_notes: evt.equipment_notes,
            clinical_notes: evt.clinical_notes,
          })
          .select()
          .single();

        if (newEvt && evt.products.length) {
          // Re-fetch original products for this event to get product_id
          const { data: origProds } = await supabase
            .from("protocol_event_products")
            .select("*")
            .eq("event_id", evt.id)
            .order("sort_order");

          if (origProds) {
            await supabase.from("protocol_event_products").insert(
              origProds.map((p) => ({
                event_id: newEvt.id,
                product_id: p.product_id,
                dosage_override: p.dosage_override,
                route_override: p.route_override,
                injection_site: p.injection_site,
                notes: p.notes,
                sort_order: p.sort_order,
              }))
            );
          }
        }
      }

      queryClient.invalidateQueries({ queryKey: ["vaccination-protocols"] });
      showToast("success", "Protocol duplicated");
      navigate(`/protocols/${newTpl.id}/edit`);
    } catch {
      showToast("error", "Failed to duplicate");
    }
  };

  if (isLoading) {
    return (
      <div className="px-4 pt-4 space-y-4">
        <Skeleton className="h-32 rounded-xl" style={{ backgroundColor: "rgba(14,38,70,0.08)" }} />
        <Skeleton className="h-48 rounded-xl" style={{ backgroundColor: "rgba(14,38,70,0.08)" }} />
      </div>
    );
  }

  if (!template) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center gap-4">
        <div style={{ color: "rgba(26,26,26,0.40)", fontSize: 15, fontWeight: 600 }}>Protocol not found</div>
        <PillButton onClick={() => navigate("/protocols")}>← Back to Protocols</PillButton>
      </div>
    );
  }

  const isActive = template.is_active;
  const cls = CLASS_COLORS[template.animal_class] || CLASS_COLORS.Feeder;

  return (
    <div className="pb-28" style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* Back nav */}
      <div className="px-4 pt-3 pb-1">
        <button
          onClick={() => navigate("/protocols")}
          className="flex items-center gap-1 cursor-pointer"
          style={{ fontSize: 13, fontWeight: 600, color: "#717182", background: "none", border: "none" }}
        >
          <ChevronLeft size={16} />
          Protocols
        </button>
      </div>

      {/* ── Header Card ── */}
      <div className="mx-4 mt-2 rounded-lg bg-white p-4" style={{ border: "1px solid #D4D4D0" }}>
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h1 className="truncate" style={{ fontSize: 20, fontWeight: 700, color: "#1A1A1A", margin: 0, lineHeight: 1.3 }}>
              {template.name}
            </h1>
            <div className="flex items-center gap-2 mt-2">
              <span
                className="rounded-full px-2.5 py-0.5"
                style={{ fontSize: 11, fontWeight: 600, backgroundColor: cls.bg, color: cls.text }}
              >
                {template.animal_class}
              </span>
              <span
                className="rounded-full px-2.5 py-0.5"
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  backgroundColor: isActive ? "rgba(85,186,170,0.15)" : "rgba(168,168,168,0.12)",
                  color: isActive ? "#55BAAA" : "#888888",
                }}
              >
                {isActive ? "Active" : "Draft"}
              </span>
            </div>
          </div>
        </div>
        {template.description && (
          <p style={{ fontSize: 14, color: "#1A1A1A", marginTop: 10, lineHeight: 1.5 }}>{template.description}</p>
        )}
        <div style={{ fontSize: 13, color: "#717182", marginTop: 8 }}>
          Created {fmtDate(template.created_at)}
        </div>
      </div>

      {/* ── Events Timeline ── */}
      <div className="mx-4 mt-4 space-y-0">
        {(events || []).map((evt, idx) => (
          <div key={evt.id}>
            {/* Days offset connector */}
            {idx > 0 && (
              <div className="flex items-center gap-2 py-2 pl-4">
                <div style={{ width: 2, height: 18, backgroundColor: "#55BAAA", borderRadius: 1 }} />
                <span style={{ fontSize: 12, fontWeight: 600, color: "#55BAAA" }}>
                  {evt.days_offset} day{evt.days_offset !== 1 ? "s" : ""} later
                </span>
              </div>
            )}

            {/* Event Card */}
            <div
              className="rounded-lg bg-white overflow-hidden"
              style={{ border: "1px solid #D4D4D0", borderLeft: "4px solid #55BAAA" }}
            >
              {/* Event header */}
              <div className="px-4 py-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <span style={{ fontSize: 15, fontWeight: 700, color: "#1A1A1A" }}>
                    {evt.event_name}
                  </span>
                  {evt.work_type_name && (
                    <span
                      className="rounded-full px-2 py-0.5"
                      style={{ fontSize: 10, fontWeight: 600, backgroundColor: "rgba(85,186,170,0.12)", color: "#55BAAA" }}
                    >
                      {evt.work_type_name}
                    </span>
                  )}
                </div>
                {evt.timing_description && (
                  <div style={{ fontSize: 13, color: "#717182", marginTop: 4 }}>{evt.timing_description}</div>
                )}
              </div>

              {/* Product table */}
              {evt.products.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full text-left" style={{ fontSize: 13, borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ borderTop: "1px solid #E8E8E4", borderBottom: "1px solid #E8E8E4" }}>
                        {["Product", "Dosage", "Route", "Site", "Withdrawal", "Notes"].map((h) => (
                          <th
                            key={h}
                            className="px-4 py-2"
                            style={{ fontWeight: 600, color: "#717182", fontSize: 11, letterSpacing: "0.04em", textTransform: "uppercase" }}
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {evt.products.map((p: any, pIdx: number) => (
                        <tr
                          key={p.id || pIdx}
                          style={{ backgroundColor: pIdx % 2 === 0 ? "#FFFFFF" : "#F5F5F0", borderBottom: "1px solid #E8E8E4" }}
                        >
                          <td className="px-4 py-2" style={{ fontWeight: 600, color: "#1A1A1A" }}>{p.name}</td>
                          <td className="px-4 py-2" style={{ color: "#1A1A1A" }}>{p.dosage}</td>
                          <td className="px-4 py-2" style={{ color: "#1A1A1A" }}>{p.route}</td>
                          <td className="px-4 py-2" style={{ color: "#1A1A1A" }}>{p.injection_site}</td>
                          <td className="px-4 py-2" style={{ color: "#1A1A1A" }}>{p.withdrawal}</td>
                          <td className="px-4 py-2" style={{ color: "#717182" }}>{p.notes || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {evt.products.length === 0 && (
                <div className="px-4 pb-3" style={{ fontSize: 13, color: "rgba(26,26,26,0.35)" }}>
                  No products assigned
                </div>
              )}

              {/* Equipment notes */}
              {evt.equipment_notes && (
                <div className="mx-4 mb-3 rounded-md px-3 py-2" style={{ backgroundColor: "#F5F5F0", fontSize: 13, color: "#1A1A1A" }}>
                  <span style={{ fontWeight: 600, color: "#717182", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                    Equipment
                  </span>
                  <div className="mt-1">{evt.equipment_notes}</div>
                </div>
              )}

              {/* Clinical notes */}
              {evt.clinical_notes && (
                <div className="mx-4 mb-3 rounded-md px-3 py-2" style={{ backgroundColor: "#F5F5F0", fontSize: 13, color: "#1A1A1A" }}>
                  <span style={{ fontWeight: 600, color: "#717182", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                    Clinical Notes
                  </span>
                  <div className="mt-1">{evt.clinical_notes}</div>
                </div>
              )}
            </div>
          </div>
        ))}

        {(!events || events.length === 0) && (
          <div className="py-10 text-center" style={{ fontSize: 14, color: "rgba(26,26,26,0.35)" }}>
            No events defined for this protocol
          </div>
        )}
      </div>

      {/* ── Actions Bar ── */}
      <div
        className="fixed bottom-0 left-0 right-0 bg-white px-4 py-3 flex items-center gap-3 z-50"
        style={{ borderTop: "1px solid #D4D4D0", boxShadow: "0 -2px 8px rgba(0,0,0,0.06)" }}
      >
        <button
          onClick={() => navigate(`/protocols/${id}/edit`)}
          className="rounded-full px-5 py-2.5 cursor-pointer active:scale-[0.97]"
          style={{ fontSize: 14, fontWeight: 600, color: "#0E2646", border: "2px solid #0E2646", background: "transparent" }}
        >
          Edit
        </button>
        <button
          onClick={() => navigate(`/protocols/${id}/assign`)}
          className="rounded-full px-5 py-2.5 cursor-pointer active:scale-[0.97] flex-1"
          style={{
            fontSize: 14,
            fontWeight: 700,
            color: "#1A1A1A",
            backgroundColor: "#F3D12A",
            border: "none",
            boxShadow: "0 2px 10px rgba(243,209,42,0.35)",
          }}
        >
          Assign to Customer
        </button>
        <button
          onClick={handleDuplicate}
          className="rounded-full px-5 py-2.5 cursor-pointer active:scale-[0.97]"
          style={{ fontSize: 14, fontWeight: 600, color: "#55BAAA", border: "2px solid #55BAAA", background: "transparent" }}
        >
          Duplicate
        </button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="rounded-full p-2 cursor-pointer"
              style={{ border: "1px solid #D4D4D0", background: "white" }}
            >
              <MoreVertical size={18} color="#717182" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={handleDelete}
              disabled={deleting}
              style={{ color: "#9B2335", fontWeight: 600 }}
            >
              {deleting ? "Deleting…" : "Delete Protocol"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
