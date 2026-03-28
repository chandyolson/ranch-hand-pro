import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOperation } from "@/contexts/OperationContext";
import { useChuteSideToast } from "@/components/ToastContext";
import { COLORS } from "@/lib/constants";
import { INPUT_CLS } from "@/lib/styles";
import { Skeleton } from "@/components/ui/skeleton";
import { MoreVertical, Trash2, X, ChevronRight } from "lucide-react";
import { CLASS_BADGE_COLORS } from "@/lib/protocol-constants";
import type { Json } from "@/integrations/supabase/types";

interface CustomerOption {
  operationId: string;
  name: string;
  clinicClientId: string | null;
}

export default function ProtocolTemplateDetailScreen() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { operationId } = useOperation();
  const queryClient = useQueryClient();
  const { showToast } = useChuteSideToast();
  const [menuOpen, setMenuOpen] = useState(false);

  // Assign flow state
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignStep, setAssignStep] = useState<"pick" | "details">("pick");
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerOption | null>(null);
  const [assignDate, setAssignDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [assignHeadCount, setAssignHeadCount] = useState("");

  // ── Template query ──
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
        .select("*, products:protocol_event_products(*, product:products(id, name, route, dosage, product_type))")
        .eq("template_id", id!)
        .order("event_order", { ascending: true });
      if (evtErr) throw evtErr;

      return { ...data, events: events || [] };
    },
    enabled: !!id,
  });

  // ── Customers query ──
  const { data: customers } = useQuery({
    queryKey: ["assign-customers"],
    queryFn: async () => {
      const { data: clients, error } = await supabase
        .from("vet_practice_clients")
        .select(`id, operation_id, clinic_client_id, operations:operation_id (id, name)`);
      if (error) throw error;
      return (clients || []).map((c) => ({
        operationId: c.operation_id,
        name: (c.operations as { id: string; name: string } | null)?.name || "Unknown",
        clinicClientId: c.clinic_client_id,
      })).sort((a: CustomerOption, b: CustomerOption) => a.name.localeCompare(b.name));
    },
    enabled: assignOpen,
  });

  // ── Delete mutation ──
  const deleteMutation = useMutation({
    mutationFn: async () => {
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

  // ── Assign mutation ──
  const assignMutation = useMutation({
    mutationFn: async () => {
      if (!template || !selectedCustomer || !assignDate) throw new Error("Missing required fields");

      const headCount = assignHeadCount ? parseInt(assignHeadCount, 10) : null;
      const startDate = new Date(assignDate + "T00:00:00");
      const protocolYear = startDate.getFullYear();

      const { data: newProto, error: protoErr } = await supabase
        .from("assigned_protocols")
        .insert({
          operation_id: operationId,
          client_operation_id: selectedCustomer.operationId,
          animal_class: template.animal_class,
          template_id: template.id,
          protocol_year: protocolYear,
          protocol_status: "draft",
          estimated_head_count: headCount,
          start_date: assignDate,
        })
        .select("id")
        .single();
      if (protoErr) throw protoErr;

      for (const evt of (template.events || [])) {
        const scheduledDate = new Date(startDate);
        scheduledDate.setDate(scheduledDate.getDate() + (evt.days_offset || 0));
        const scheduledDateStr = scheduledDate.toISOString().split("T")[0];

        const recommendedProducts = (evt.products || []).map((ep: any) => ({
          product_id: ep.product?.id || ep.product_id,
          product_name: ep.product?.name || "Unknown",
          dosage: ep.dosage_override || ep.product?.dosage || null,
          route: ep.route_override || ep.product?.route || null,
          notes: ep.notes || null,
        }));

        await supabase
          .from("assigned_protocol_events")
          .insert({
            assigned_protocol_id: newProto!.id,
            event_name: evt.event_name,
            template_event_id: evt.id,
            scheduled_date: scheduledDateStr,
            event_status: "upcoming",
            recommended_products: recommendedProducts as unknown as Json,
          });
      }

      return { customerName: selectedCustomer.name, customerOpId: selectedCustomer.operationId };
    },
    onSuccess: ({ customerName, customerOpId }) => {
      queryClient.invalidateQueries({ queryKey: ["protocol-hub-customers"] });
      queryClient.invalidateQueries({ queryKey: ["customer-protocols", customerOpId] });
      showToast("success", `Protocol assigned to ${customerName}`);
      closeAssignSheet();
      navigate(`/protocols/customer/${customerOpId}`);
    },
    onError: (err: any) => {
      showToast("error", err.message || "Failed to assign protocol");
    },
  });

  const openAssignSheet = () => {
    setAssignStep("pick");
    setSelectedCustomer(null);
    setAssignDate(new Date().toISOString().split("T")[0]);
    setAssignHeadCount("");
    setAssignOpen(true);
  };

  const closeAssignSheet = () => {
    setAssignOpen(false);
    setSelectedCustomer(null);
    setAssignStep("pick");
  };

  const handlePickCustomer = (customer: CustomerOption) => {
    setSelectedCustomer(customer);
    setAssignStep("details");
  };

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

  const badge = CLASS_BADGE_COLORS[template.animal_class] || CLASS_BADGE_COLORS.Feeder;

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
              <div>
                <span style={{ fontSize: 15, fontWeight: 700, color: COLORS.textOnLight }}>{evt.event_name}</span>
                {evt.timing_description && (
                  <div style={{ fontSize: 12, color: COLORS.mutedText, fontStyle: "italic", marginTop: 2 }}>
                    {evt.timing_description}
                  </div>
                )}
              </div>
              <span
                className="rounded-full px-2 py-0.5 shrink-0"
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
            {evt.clinical_notes && (
              <div className="px-3 py-2" style={{ borderTop: `1px solid ${COLORS.borderDivider}`, backgroundColor: "#F5F5F0" }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: COLORS.mutedText, letterSpacing: "0.05em", textTransform: "uppercase" }}>Clinical Notes</div>
                <div style={{ fontSize: 13, color: COLORS.textOnLight, marginTop: 4 }}>{evt.clinical_notes}</div>
              </div>
            )}
            {evt.equipment_notes && (
              <div className="px-3 py-2" style={{ borderTop: `1px solid ${COLORS.borderDivider}`, backgroundColor: "#F5F5F0" }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: COLORS.mutedText, letterSpacing: "0.05em", textTransform: "uppercase" }}>Equipment / Supplies</div>
                <div style={{ fontSize: 13, color: COLORS.textOnLight, marginTop: 4 }}>{evt.equipment_notes}</div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* ── Bottom Action Bar ── */}
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
          onClick={openAssignSheet}
          className="flex-1 rounded-lg py-2.5 font-semibold text-sm active:scale-[0.98] transition-all"
          style={{ backgroundColor: COLORS.gold, color: COLORS.textOnLight, minHeight: 44 }}
        >
          Assign to Customer
        </button>
      </div>

      {/* ── Assign Bottom Sheet ── */}
      {assignOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" onClick={closeAssignSheet}>
          <div className="absolute inset-0 bg-black/40" />
          <div
            className="relative w-full max-w-md max-h-[70vh] flex flex-col rounded-t-2xl sm:rounded-2xl bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 pt-4 pb-2">
              <span style={{ fontSize: 16, fontWeight: 700, color: COLORS.textOnLight }}>
                {assignStep === "pick" ? "Select Customer" : `Assign to ${selectedCustomer?.name}`}
              </span>
              <button onClick={closeAssignSheet} className="p-1 rounded-full hover:bg-gray-100 active:bg-gray-200">
                <X size={20} style={{ color: COLORS.mutedText }} />
              </button>
            </div>

            {assignStep === "pick" && (
              <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-1">
                {(!customers || customers.length === 0) && (
                  <div className="py-8 text-center" style={{ fontSize: 13, color: COLORS.mutedText }}>
                    No customers found. Add customers in Reference → Team.
                  </div>
                )}
                {(customers || []).map((c: CustomerOption) => (
                  <button
                    key={c.operationId}
                    className="w-full text-left rounded-lg px-3 py-3 hover:bg-gray-50 active:bg-gray-100 transition-colors flex items-center justify-between"
                    style={{ minHeight: 44 }}
                    onClick={() => handlePickCustomer(c)}
                  >
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: COLORS.textOnLight }}>{c.name}</div>
                      {c.clinicClientId && (
                        <div style={{ fontSize: 11, color: COLORS.mutedText }}>ID: {c.clinicClientId}</div>
                      )}
                    </div>
                    <ChevronRight size={16} style={{ color: COLORS.mutedText }} />
                  </button>
                ))}
              </div>
            )}

            {assignStep === "details" && (
              <div className="px-4 pb-4 space-y-4">
                <div className="rounded-lg px-3 py-2.5" style={{ backgroundColor: "#F5F5F0" }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: COLORS.textOnLight }}>{template.name}</div>
                  <div style={{ fontSize: 12, color: COLORS.mutedText }}>
                    {template.animal_class} · {template.events.length} stage{template.events.length !== 1 ? "s" : ""}
                  </div>
                </div>

                <div className="space-y-1">
                  <label style={{ fontSize: 13, fontWeight: 600, color: COLORS.textOnLight }}>Start Date</label>
                  <input
                    type="date"
                    className={INPUT_CLS}
                    style={{ width: "100%", fontSize: 16 }}
                    value={assignDate}
                    onChange={(e) => setAssignDate(e.target.value)}
                  />
                  {template.events.length > 1 && assignDate && (
                    <div style={{ fontSize: 12, color: COLORS.mutedText, marginTop: 4 }}>
                      {template.events.map((evt: any, i: number) => {
                        const d = new Date(assignDate + "T00:00:00");
                        d.setDate(d.getDate() + (evt.days_offset || 0));
                        return (
                          <div key={i}>
                            Stage {i + 1}: {evt.event_name} → {d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="space-y-1">
                  <label style={{ fontSize: 13, fontWeight: 600, color: COLORS.textOnLight }}>Estimated Head Count</label>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={1}
                    className={INPUT_CLS}
                    style={{ width: "100%", fontSize: 16 }}
                    placeholder="e.g., 150"
                    value={assignHeadCount}
                    onChange={(e) => setAssignHeadCount(e.target.value)}
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => { setAssignStep("pick"); setSelectedCustomer(null); }}
                    className="flex-1 rounded-full py-2.5 font-semibold text-sm active:scale-[0.97] transition-all"
                    style={{ border: `1px solid ${COLORS.borderDivider}`, color: COLORS.textOnLight, backgroundColor: "transparent", minHeight: 44 }}
                  >
                    Back
                  </button>
                  <button
                    onClick={() => assignMutation.mutate()}
                    disabled={assignMutation.isPending || !assignDate}
                    className="flex-1 rounded-full py-2.5 font-semibold text-sm active:scale-[0.97] transition-all disabled:opacity-50"
                    style={{ backgroundColor: COLORS.gold, color: COLORS.textOnLight, minHeight: 44 }}
                  >
                    {assignMutation.isPending ? "Assigning…" : "Assign Protocol"}
                  </button>
                </div>

                {assignMutation.isError && (
                  <div className="rounded-lg px-3 py-2" style={{ backgroundColor: "rgba(212,24,61,0.08)", color: COLORS.destructiveRed, fontSize: 13 }}>
                    {(assignMutation.error as Error).message}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
