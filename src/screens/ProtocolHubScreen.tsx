import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOperation } from "@/contexts/OperationContext";
import { Skeleton } from "@/components/ui/skeleton";
import { INPUT_CLS } from "@/lib/styles";
import { COLORS } from "@/lib/constants";
import { ChevronRight, Plus, Users, FileText, Search, X } from "lucide-react";
import { CLASS_BADGE_COLORS } from "@/lib/protocol-constants";

type Tab = "customers" | "templates";

export default function ProtocolHubScreen() {
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<Tab>("customers");
  const [fabOpen, setFabOpen] = useState(false);
  const [customerPickerOpen, setCustomerPickerOpen] = useState(false);
  const fabRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { operationId } = useOperation();

  /* close FAB on outside click */
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (fabRef.current && !fabRef.current.contains(e.target as Node)) setFabOpen(false);
    };
    if (fabOpen) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [fabOpen]);

  /* ── Customers query (vet_practice_clients → operations) ── */
  const { data: customers, isLoading: loadingCustomers } = useQuery({
    queryKey: ["protocol-hub-customers", operationId],
    queryFn: async () => {
      const { data: clients, error } = await supabase
        .from("vet_practice_clients")
        .select(`
          id,
          operation_id,
          clinic_client_id,
          operations:operation_id (
            id,
            name
          )
        `);

      console.log("[ProtocolHub] vet_practice_clients full response:", JSON.stringify({ clients, error }, null, 2));

      if (error) throw error;
      if (!clients || clients.length === 0) return [];

      const opIds = clients.map((c: any) => c.operation_id);

      const customerOps = clients.map((c: any) => ({
        operationId: c.operation_id,
        name: (c.operations as any)?.name || "Unknown",
        clinicClientId: c.clinic_client_id,
      }));

      // reuse opIds from above

      /* Check assigned_protocols for history */
      const { data: protocols } = await supabase
        .from("assigned_protocols")
        .select("id, animal_class, protocol_status, created_at, client_operation_id, protocol_year")
        .in("client_operation_id", opIds);

      return customerOps.map((c) => {
        const myProtos = (protocols || []).filter((p: any) => p.client_operation_id === c.operationId);
        const animalTypes = [...new Set(myProtos.map((p: any) => p.animal_class))];
        const latestYear = myProtos.length > 0
          ? Math.max(...myProtos.map((p: any) => p.protocol_year).filter(Boolean))
          : null;

        return {
          operationId: c.operationId,
          name: c.name,
          clinicClientId: c.clinicClientId,
          animalTypes,
          protocolCount: myProtos.length,
          latestYear,
        };
      }).sort((a, b) => {
        const aPri = a.protocolCount > 0 ? 0 : 1;
        const bPri = b.protocolCount > 0 ? 0 : 1;
        if (aPri !== bPri) return aPri - bPri;
        return a.name.localeCompare(b.name);
      });
    },
  });

  /* ── Templates query ── */
  const { data: templates, isLoading: loadingTemplates } = useQuery({
    queryKey: ["protocol-hub-templates", operationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vaccination_protocol_templates")
        .select("*, events:protocol_template_events(id)")
        .eq("operation_id", operationId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []).map((t: any) => ({
        id: t.id,
        name: t.name,
        animalClass: t.animal_class || "Calves",
        eventCount: Array.isArray(t.events) ? t.events.length : 0,
        isActive: t.is_active !== false,
      }));
    },
  });

  /* ── Filtered lists ── */
  const filteredCustomers = (customers || []).filter(
    (c) => !search || c.name.toLowerCase().includes(search.toLowerCase())
  );
  const filteredTemplates = (templates || []).filter(
    (t) => !search || t.name.toLowerCase().includes(search.toLowerCase())
  );

  const isLoading = tab === "customers" ? loadingCustomers : loadingTemplates;

  return (
    <div className="px-4 pt-1 pb-24 space-y-3" style={{ minHeight: "100%" }}>
      {/* Search */}
      <div className="relative">
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
          style={{ color: COLORS.mutedText }}
        />
        <input
          className={INPUT_CLS}
          style={{ paddingLeft: 36, width: "100%" }}
          placeholder={tab === "customers" ? "Search customers…" : "Search templates…"}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {([
          { key: "customers" as Tab, label: "Customer Protocols" },
          { key: "templates" as Tab, label: "Templates" },
        ]).map(({ key, label }) => {
          const active = tab === key;
          return (
            <button
              key={key}
              onClick={() => { setTab(key); setSearch(""); }}
              className="rounded-full px-4 py-1.5 text-sm font-semibold transition-all active:scale-[0.97]"
              style={{
                backgroundColor: active ? COLORS.navy : "transparent",
                color: active ? "#FFFFFF" : COLORS.navy,
                border: active ? "none" : `1px solid ${COLORS.borderDivider}`,
              }}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-[80px] rounded-lg" style={{ backgroundColor: "rgba(14,38,70,0.08)" }} />
          ))}
        </div>
      )}

      {/* ── Customer Protocols Tab ── */}
      {tab === "customers" && !loadingCustomers && (
        <>
          {filteredCustomers.length > 0 ? (
            <div className="space-y-2">
              {filteredCustomers.map((c) => (
                <button
                  key={c.operationId}
                  className="w-full text-left rounded-lg bg-white px-4 py-3.5 cursor-pointer active:scale-[0.98] transition-transform shadow-sm"
                  style={{ border: `1px solid ${COLORS.borderDivider}` }}
                  onClick={() => navigate(`/protocols/customer/${c.operationId}`)}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="truncate" style={{ fontSize: 16, fontWeight: 700, color: COLORS.textOnLight, lineHeight: 1.3 }}>
                        {c.name}
                      </div>
                      {c.animalTypes.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-1.5">
                          {c.animalTypes.map((at: string) => {
                            const badge = CLASS_BADGE_COLORS[at] || CLASS_BADGE_COLORS.Feeders;
                            return (
                              <span
                                key={at}
                                className="rounded-full px-2 py-0.5"
                                style={{ fontSize: 11, fontWeight: 600, backgroundColor: badge.bg, color: badge.text }}
                              >
                                {at}
                              </span>
                            );
                          })}
                        </div>
                      )}
                      <div className="mt-1" style={{ fontSize: 13, color: COLORS.mutedText }}>
                        {c.latestYear
                          ? `${c.latestYear} Program · ${c.protocolCount} protocol${c.protocolCount !== 1 ? "s" : ""}`
                          : "No protocols yet"}
                      </div>
                    </div>
                    <ChevronRight size={18} style={{ color: COLORS.mutedText, flexShrink: 0 }} />
                  </div>
                </button>
              ))}
            </div>
          ) : customers && customers.length === 0 ? (
            <div className="py-16 text-center space-y-2">
              <div style={{ fontSize: 15, fontWeight: 600, color: "rgba(26,26,26,0.40)" }}>
                No customers yet
              </div>
              <div style={{ fontSize: 13, color: "rgba(26,26,26,0.30)" }}>
                Add customers in Reference → Team to get started.
              </div>
            </div>
          ) : (
            <div className="py-12 text-center space-y-1.5">
              <div style={{ fontSize: 15, fontWeight: 600, color: "rgba(26,26,26,0.40)" }}>No customers found</div>
              <div style={{ fontSize: 13, color: "rgba(26,26,26,0.30)" }}>Try a different search</div>
            </div>
          )}
        </>
      )}

      {/* ── Templates Tab ── */}
      {tab === "templates" && !loadingTemplates && (
        <>
          {(templates || []).length === 0 ? (
            <div className="py-16 text-center space-y-3">
              <div style={{ fontSize: 15, fontWeight: 600, color: "rgba(26,26,26,0.40)" }}>
                No templates yet
              </div>
              <div style={{ fontSize: 13, color: "rgba(26,26,26,0.30)" }}>
                Create a template to reuse across customers.
              </div>
              <button
                onClick={() => navigate("/protocols/templates/new")}
                className="rounded-full px-5 py-2 text-sm font-semibold active:scale-95 transition-all"
                style={{ backgroundColor: COLORS.gold, color: COLORS.textOnLight }}
              >
                Create Template
              </button>
            </div>
          ) : filteredTemplates.length > 0 ? (
            <div className="space-y-2">
              {filteredTemplates.map((t) => {
                const badge = CLASS_BADGE_COLORS[t.animalClass] || CLASS_BADGE_COLORS.Feeders;
                return (
                  <button
                    key={t.id}
                    className="w-full text-left rounded-lg bg-white px-4 py-3.5 cursor-pointer active:scale-[0.98] transition-transform shadow-sm"
                    style={{ border: `1px solid ${COLORS.borderDivider}` }}
                    onClick={() => navigate(`/protocols/templates/${t.id}`)}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="truncate" style={{ fontSize: 16, fontWeight: 700, color: COLORS.textOnLight }}>
                          {t.name}
                        </div>
                        <div className="flex items-center gap-2 mt-1.5">
                          <span
                            className="rounded-full px-2 py-0.5"
                            style={{ fontSize: 11, fontWeight: 600, backgroundColor: badge.bg, color: badge.text }}
                          >
                            {t.animalClass}
                          </span>
                          <span style={{ fontSize: 12, color: COLORS.mutedText }}>
                            {t.eventCount} stage{t.eventCount !== 1 ? "s" : ""}
                          </span>
                          <span
                            className="rounded-full px-2 py-0.5"
                            style={{
                              fontSize: 10, fontWeight: 600,
                              backgroundColor: t.isActive ? "rgba(85,186,170,0.12)" : "rgba(168,168,168,0.12)",
                              color: t.isActive ? "#55BAAA" : "#888888",
                            }}
                          >
                            {t.isActive ? "Active" : "Inactive"}
                          </span>
                        </div>
                      </div>
                      <ChevronRight size={18} style={{ color: COLORS.mutedText, flexShrink: 0 }} />
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="py-12 text-center space-y-1.5">
              <div style={{ fontSize: 15, fontWeight: 600, color: "rgba(26,26,26,0.40)" }}>No templates found</div>
              <div style={{ fontSize: 13, color: "rgba(26,26,26,0.30)" }}>Try a different search</div>
            </div>
          )}
        </>
      )}

      {/* ── Customer Picker Modal ── */}
      {customerPickerOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" onClick={() => setCustomerPickerOpen(false)}>
          <div className="absolute inset-0 bg-black/40" />
          <div
            className="relative w-full max-w-md max-h-[60vh] flex flex-col rounded-t-2xl sm:rounded-2xl bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 pt-4 pb-2">
              <span style={{ fontSize: 16, fontWeight: 700, color: COLORS.textOnLight }}>Select Customer</span>
              <button onClick={() => setCustomerPickerOpen(false)} className="p-1 rounded-full hover:bg-gray-100">
                <X size={20} style={{ color: COLORS.mutedText }} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-1">
              {(customers || []).length === 0 && (
                <div className="py-8 text-center" style={{ fontSize: 13, color: COLORS.mutedText }}>
                  No customers found. Add customers in Reference → Team.
                </div>
              )}
              {(customers || []).map((c) => (
                <button
                  key={c.operationId}
                  className="w-full text-left rounded-lg px-3 py-2.5 hover:bg-gray-50 active:bg-gray-100 transition-colors"
                  style={{ minHeight: 44 }}
                  onClick={() => {
                    setCustomerPickerOpen(false);
                    navigate(`/protocols/customer/${c.operationId}`);
                  }}
                >
                  <div style={{ fontSize: 14, fontWeight: 600, color: COLORS.textOnLight }}>{c.name}</div>
                  {c.clinicClientId && (
                    <div style={{ fontSize: 11, color: COLORS.mutedText }}>{c.clinicClientId}</div>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── FAB ── */}
      <div ref={fabRef} className="fixed bottom-20 right-4 z-50 flex flex-col items-end gap-2">
        {fabOpen && (
          <div
            className="rounded-lg shadow-lg overflow-hidden"
            style={{ backgroundColor: COLORS.white, border: `1px solid ${COLORS.borderDivider}`, minWidth: 200 }}
          >
            <button
              className="w-full text-left px-4 py-3 hover:bg-gray-50 active:bg-gray-100 transition-colors flex items-center gap-3"
              onClick={() => { setFabOpen(false); setCustomerPickerOpen(true); }}
            >
              <Users size={16} style={{ color: COLORS.navy }} />
              <span style={{ fontSize: 14, fontWeight: 600, color: COLORS.textOnLight }}>New Customer Protocol</span>
            </button>
            <div style={{ height: 1, backgroundColor: COLORS.borderDivider }} />
            <button
              className="w-full text-left px-4 py-3 hover:bg-gray-50 active:bg-gray-100 transition-colors flex items-center gap-3"
              onClick={() => { setFabOpen(false); navigate("/protocols/templates/new"); }}
            >
              <FileText size={16} style={{ color: COLORS.navy }} />
              <span style={{ fontSize: 14, fontWeight: 600, color: COLORS.textOnLight }}>New Blank Template</span>
            </button>
          </div>
        )}
        <button
          onClick={() => setFabOpen((o) => !o)}
          className="rounded-full shadow-lg active:scale-95 transition-all flex items-center justify-center"
          style={{
            width: 56,
            height: 56,
            backgroundColor: COLORS.gold,
            boxShadow: "0 4px 14px rgba(243,209,42,0.40)",
          }}
        >
          <Plus
            size={24}
            style={{
              color: COLORS.textOnLight,
              transform: fabOpen ? "rotate(45deg)" : "rotate(0deg)",
              transition: "transform 200ms",
            }}
          />
        </button>
      </div>
    </div>
  );
}
