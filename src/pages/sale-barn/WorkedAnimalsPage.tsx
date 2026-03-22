import React, { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOperation } from "@/contexts/OperationContext";
import { useChuteSideToast as useToast } from "@/components/ToastContext";
import type { WorkOrder, SaleBarnAnimal, SaleBarnCustomer, DesignationKey, SaleDay } from "@/types/sale-barn";

const fmtDate = (iso: string) => {
  const d = new Date(iso + "T12:00:00");
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
};

const fmtTime = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
};

const IS: Record<string, React.CSSProperties> = {
  search: {
    width: "100%", height: 44, borderRadius: 12, border: "1px solid rgba(212,212,208,0.60)",
    background: "#FFFFFF", fontSize: 16, fontFamily: "Inter, sans-serif", padding: "0 40px 0 40px",
    outline: "none", boxSizing: "border-box",
  },
  pill: {
    height: 32, borderRadius: 9999, padding: "0 14px", whiteSpace: "nowrap",
    fontSize: 13, fontWeight: 600, border: "1px solid #D4D4D0", background: "#FFFFFF",
    color: "rgba(26,26,26,0.50)", cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
    flexShrink: 0,
  },
  pillActive: {
    background: "#0E2646", color: "#FFFFFF", border: "1px solid #0E2646",
  },
  card: {
    background: "#FFFFFF", borderRadius: 10, border: "1px solid rgba(212,212,208,0.60)",
    padding: "10px 14px", marginBottom: 6, cursor: "pointer",
  },
  advInput: {
    height: 36, borderRadius: 8, border: "1px solid #D4D4D0", fontSize: 16,
    fontFamily: "Inter, sans-serif", padding: "0 12px", outline: "none",
    width: "100%", boxSizing: "border-box" as const,
  },
};

const ENTITY_BADGE: Record<string, { bg: string; text: string }> = {
  seller: { bg: "rgba(243,209,42,0.12)", text: "#B8860B" },
  buyer: { bg: "rgba(85,186,170,0.15)", text: "#55BAAA" },
};

const QUICK_NOTE_PILL_COLORS: Record<string, { bg: string; text: string }> = {
  red: { bg: "rgba(220,38,38,0.12)", text: "#DC2626" },
  gold: { bg: "rgba(243,209,42,0.12)", text: "#B8860B" },
  teal: { bg: "rgba(85,186,170,0.15)", text: "#55BAAA" },
};

const ChevronLeft = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M12.5 15L7.5 10L12.5 5" stroke="#1A1A1A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
);

const SearchIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#717182" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
);

const DownloadIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
);

const FunnelIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#55BAAA" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
);

type MergedAnimal = SaleBarnAnimal & {
  customer_name: string;
  entity_type: string;
  pens: string[];
  work_type: string;
  buyer_num: string | null;
};

const WorkedAnimalsPage: React.FC = () => {
  const { id: saleDayId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { operationId } = useOperation();
  const { showToast } = useToast();

  const [search, setSearch] = useState("");
  const [entityFilter, setEntityFilter] = useState("All");
  const [designationFilter, setDesignationFilter] = useState("All Designation");
  const [pregFilter, setPregFilter] = useState("All Preg");
  const [sortFilter, setSortFilter] = useState("All");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [advFilters, setAdvFilters] = useState({ customer: "", workType: "", pen: "", sex: "", breed: "", hasNotes: false });
  const [appliedAdv, setAppliedAdv] = useState({ customer: "", workType: "", pen: "", sex: "", breed: "", hasNotes: false });

  // Fetch sale day
  const { data: saleDay } = useQuery({
    queryKey: ["sale_day", saleDayId],
    queryFn: async () => {
      const { data } = await (supabase.from("sale_days" as any)).select("*").eq("id", saleDayId).single();
      return data as unknown as SaleDay;
    },
  });

  // Fetch work orders
  const { data: workOrders = [] } = useQuery({
    queryKey: ["wa_work_orders", saleDayId],
    enabled: !!saleDayId,
    queryFn: async () => {
      const { data } = await (supabase.from("work_orders" as any)).select("*").eq("sale_day_id", saleDayId);
      return (data ?? []) as unknown as WorkOrder[];
    },
  });

  const woIds = useMemo(() => workOrders.map(w => w.id), [workOrders]);
  const customerIds = useMemo(() => [...new Set(workOrders.map(w => w.customer_id).filter(Boolean))] as string[], [workOrders]);

  // Fetch animals
  const { data: animals = [] } = useQuery({
    queryKey: ["wa_animals", woIds],
    enabled: woIds.length > 0,
    queryFn: async () => {
      const { data } = await (supabase.from("sale_barn_animals" as any)).select("*").in("work_order_id", woIds);
      return (data ?? []) as unknown as SaleBarnAnimal[];
    },
  });

  // Fetch customers
  const { data: customerMap = {} } = useQuery({
    queryKey: ["wa_customers", customerIds],
    enabled: customerIds.length > 0,
    queryFn: async () => {
      const { data } = await (supabase.from("sale_barn_customers" as any)).select("id, name").in("id", customerIds);
      return Object.fromEntries((data ?? []).map((c: any) => [c.id, c.name])) as Record<string, string>;
    },
  });

  // Fetch designation keys
  const { data: designationKeys = [] } = useQuery({
    queryKey: ["wa_desg_keys", operationId],
    enabled: !!operationId,
    queryFn: async () => {
      const { data } = await (supabase.from("designation_keys" as any)).select("*").eq("operation_id", operationId).order("sort_order");
      return (data ?? []) as unknown as DesignationKey[];
    },
  });

  const desgMap = useMemo(() => Object.fromEntries(designationKeys.map(d => [d.label, d])), [designationKeys]);

  // Merge animals with work order data
  const woMap = useMemo(() => Object.fromEntries(workOrders.map(w => [w.id, w])), [workOrders]);

  const merged: MergedAnimal[] = useMemo(() =>
    animals.map(a => {
      const wo = woMap[a.work_order_id];
      return {
        ...a,
        customer_name: (wo?.customer_id && customerMap[wo.customer_id]) || (wo?.buyer_num ? `#${wo.buyer_num}` : "Unknown"),
        entity_type: wo?.entity_type || "seller",
        pens: wo?.pens || [],
        work_type: wo?.work_type || "",
        buyer_num: wo?.buyer_num || null,
      };
    }).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
    [animals, woMap, customerMap]
  );

  // Filtering
  const filtered = useMemo(() => {
    let list = merged;

    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(a =>
        a.eid?.toLowerCase().includes(q) ||
        a.back_tag?.toLowerCase().includes(q) ||
        a.tag_number?.toLowerCase().includes(q)
      );
    }

    // Entity
    if (entityFilter === "Sellers") list = list.filter(a => a.entity_type === "seller");
    if (entityFilter === "Buyers") list = list.filter(a => a.entity_type === "buyer");

    // Designation
    if (designationFilter !== "All Designation") {
      list = list.filter(a => a.designation_key === designationFilter);
    }

    // Preg
    if (pregFilter === "Pregnant") list = list.filter(a => a.preg_status?.toLowerCase() === "pregnant" || a.preg_status?.toLowerCase() === "bred");
    if (pregFilter === "Open") list = list.filter(a => a.preg_status?.toLowerCase() === "open");
    if (pregFilter === "Not Checked") list = list.filter(a => !a.preg_status);

    // Sort
    if (sortFilter === "Sorted") list = list.filter(a => a.sorted);
    if (sortFilter === "Not Sorted") list = list.filter(a => !a.sorted);

    // Advanced
    if (appliedAdv.customer) {
      const q = appliedAdv.customer.toLowerCase();
      list = list.filter(a => a.customer_name.toLowerCase().includes(q));
    }
    if (appliedAdv.workType) list = list.filter(a => a.work_type === appliedAdv.workType);
    if (appliedAdv.pen) {
      const q = appliedAdv.pen.toLowerCase();
      list = list.filter(a => a.pens.some(p => p.toLowerCase().includes(q)));
    }
    if (appliedAdv.sex) list = list.filter(a => a.sex?.toLowerCase() === appliedAdv.sex.toLowerCase());
    if (appliedAdv.breed) {
      const q = appliedAdv.breed.toLowerCase();
      list = list.filter(a => a.breed?.toLowerCase().includes(q));
    }
    if (appliedAdv.hasNotes) list = list.filter(a => (a.quick_notes?.length ?? 0) > 0);

    return list;
  }, [merged, search, entityFilter, designationFilter, pregFilter, sortFilter, appliedAdv]);

  const stats = useMemo(() => ({
    count: filtered.length,
    sellers: filtered.filter(a => a.entity_type === "seller").length,
    buyers: filtered.filter(a => a.entity_type === "buyer").length,
    sorted: filtered.filter(a => a.sorted).length,
  }), [filtered]);

  // Work types from work orders
  const workTypes = useMemo(() => [...new Set(workOrders.map(w => w.work_type).filter(Boolean))], [workOrders]);

  // Export CSV
  const exportCSV = () => {
    const headers = ["EID", "Back Tag", "Tag #", "Designation", "Preg Status", "Sex", "Breed", "Customer", "Seller/Buyer", "Pen", "Work Type", "Sorted", "Sort Dest Pen", "Quick Notes", "Timestamp"];
    const rows = filtered.map(a => [
      a.eid, a.back_tag || "", a.tag_number || "", a.designation_key || "", a.preg_status || "",
      a.sex || "", a.breed || "", a.customer_name, a.entity_type,
      a.pens.join("; "), a.work_type, a.sorted ? "Yes" : "No", a.sort_dest_pen || "",
      (a.quick_notes || []).join("; "),
      new Date(a.created_at).toLocaleString(),
    ]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `worked_animals_${saleDay?.date || "export"}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("success", "CSV downloaded");
  };

  return (
    <div style={{ fontFamily: "Inter, sans-serif", background: "#F5F5F0", minHeight: "100vh", paddingBottom: 70 }}>
      {/* Header */}
      <div style={{ background: "#FFFFFF", padding: "14px 16px 12px", borderBottom: "1px solid rgba(212,212,208,0.40)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button onClick={() => navigate(`/sale-barn/${saleDayId}`)} style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}>
            <ChevronLeft />
          </button>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, color: "#0E2646" }}>Worked Animals</div>
            <div style={{ fontSize: 12, fontWeight: 500, color: "#55BAAA" }}>
              {saleDay ? fmtDate(saleDay.date) : "Loading..."} · {merged.length} head
            </div>
          </div>
        </div>
      </div>

      <div style={{ padding: "12px 16px 0" }}>
        {/* Search + Export row */}
        <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
          <div style={{ flex: 1, position: "relative" }}>
            <div style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }}><SearchIcon /></div>
            <input
              style={IS.search}
              placeholder="Search EID, back tag, or tag #..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {search && (
              <button onClick={() => setSearch("")} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", fontSize: 16, color: "#717182" }}>✕</button>
            )}
          </div>
          <button onClick={exportCSV} className="active:scale-[0.97]" style={{
            height: 36, borderRadius: 9999, border: "1.5px solid #0E2646", background: "#FFFFFF",
            color: "#0E2646", fontSize: 13, fontWeight: 600, padding: "0 14px", cursor: "pointer",
            display: "flex", alignItems: "center", gap: 6, whiteSpace: "nowrap", flexShrink: 0,
          }}>
            <DownloadIcon /> Export
          </button>
        </div>

        {/* Quick filter pills */}
        <div style={{ display: "flex", gap: 8, overflowX: "auto", padding: "0 0 10px", WebkitOverflowScrolling: "touch" }}>
          {/* Entity group */}
          {["All", "Sellers", "Buyers"].map(f => (
            <button key={f} onClick={() => setEntityFilter(f)} style={{ ...IS.pill, ...(entityFilter === f ? IS.pillActive : {}) }}>{f}</button>
          ))}
          <div style={{ width: 1, background: "rgba(212,212,208,0.40)", flexShrink: 0, margin: "4px 2px" }} />
          {/* Designation group */}
          <button onClick={() => setDesignationFilter("All Designation")} style={{ ...IS.pill, ...(designationFilter === "All Designation" ? IS.pillActive : {}) }}>All Designation</button>
          {designationKeys.map(dk => (
            <button key={dk.label} onClick={() => setDesignationFilter(dk.label)} style={{ ...IS.pill, ...(designationFilter === dk.label ? IS.pillActive : {}) }}>
              <span style={{ width: 10, height: 10, borderRadius: "50%", background: dk.hex_color, flexShrink: 0 }} />
              {dk.label}
            </button>
          ))}
          <div style={{ width: 1, background: "rgba(212,212,208,0.40)", flexShrink: 0, margin: "4px 2px" }} />
          {/* Preg group */}
          {["All Preg", "Pregnant", "Open", "Not Checked"].map(f => (
            <button key={f} onClick={() => setPregFilter(f)} style={{ ...IS.pill, ...(pregFilter === f ? IS.pillActive : {}) }}>{f}</button>
          ))}
          <div style={{ width: 1, background: "rgba(212,212,208,0.40)", flexShrink: 0, margin: "4px 2px" }} />
          {/* Sort group */}
          {["All", "Sorted", "Not Sorted"].map(f => (
            <button key={`sort-${f}`} onClick={() => setSortFilter(f)} style={{ ...IS.pill, ...(sortFilter === f ? IS.pillActive : {}) }}>{f}</button>
          ))}
          <span style={{ fontSize: 12, fontWeight: 600, color: "rgba(26,26,26,0.40)", whiteSpace: "nowrap", display: "flex", alignItems: "center", flexShrink: 0 }}>{filtered.length} head</span>
        </div>

        {/* Advanced filters toggle */}
        <button onClick={() => setShowAdvanced(!showAdvanced)} style={{
          background: "none", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600,
          color: "#55BAAA", display: "flex", alignItems: "center", gap: 6, padding: "0 0 10px",
        }}>
          <FunnelIcon /> Advanced Filters {showAdvanced ? "▲" : "▼"}
        </button>

        {showAdvanced && (
          <div style={{
            background: "#FFFFFF", borderRadius: 12, border: "1px solid rgba(212,212,208,0.60)",
            padding: "12px 14px", marginBottom: 10,
          }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <label style={{ width: 85, fontSize: 13, fontWeight: 600, color: "#1A1A1A", flexShrink: 0 }}>Customer</label>
                <input style={IS.advInput} placeholder="Search..." value={advFilters.customer} onChange={e => setAdvFilters(p => ({ ...p, customer: e.target.value }))} />
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <label style={{ width: 85, fontSize: 13, fontWeight: 600, color: "#1A1A1A", flexShrink: 0 }}>Work Type</label>
                <select style={IS.advInput} value={advFilters.workType} onChange={e => setAdvFilters(p => ({ ...p, workType: e.target.value }))}>
                  <option value="">All</option>
                  {workTypes.map(wt => <option key={wt} value={wt}>{wt}</option>)}
                </select>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <label style={{ width: 85, fontSize: 13, fontWeight: 600, color: "#1A1A1A", flexShrink: 0 }}>Pen</label>
                <input style={IS.advInput} placeholder="Pen #" value={advFilters.pen} onChange={e => setAdvFilters(p => ({ ...p, pen: e.target.value }))} />
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <label style={{ width: 85, fontSize: 13, fontWeight: 600, color: "#1A1A1A", flexShrink: 0 }}>Sex</label>
                <select style={IS.advInput} value={advFilters.sex} onChange={e => setAdvFilters(p => ({ ...p, sex: e.target.value }))}>
                  <option value="">All</option>
                  <option>Bull</option><option>Heifer</option><option>Steer</option>
                </select>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <label style={{ width: 85, fontSize: 13, fontWeight: 600, color: "#1A1A1A", flexShrink: 0 }}>Breed</label>
                <input style={IS.advInput} placeholder="Breed" value={advFilters.breed} onChange={e => setAdvFilters(p => ({ ...p, breed: e.target.value }))} />
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <label style={{ width: 85, fontSize: 13, fontWeight: 600, color: "#1A1A1A", flexShrink: 0 }}>Has Notes</label>
                <button
                  onClick={() => setAdvFilters(p => ({ ...p, hasNotes: !p.hasNotes }))}
                  style={{
                    width: 44, height: 24, borderRadius: 12, border: "none", cursor: "pointer",
                    background: advFilters.hasNotes ? "#55BAAA" : "#D4D4D0",
                    position: "relative", transition: "background 0.2s",
                  }}
                >
                  <div style={{
                    width: 18, height: 18, borderRadius: 9, background: "#FFFFFF",
                    position: "absolute", top: 3,
                    left: advFilters.hasNotes ? 22 : 4, transition: "left 0.2s",
                  }} />
                </button>
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 12 }}>
              <button
                onClick={() => { setAdvFilters({ customer: "", workType: "", pen: "", sex: "", breed: "", hasNotes: false }); setAppliedAdv({ customer: "", workType: "", pen: "", sex: "", breed: "", hasNotes: false }); }}
                style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600, color: "#55BAAA" }}
              >Clear Filters</button>
              <button
                onClick={() => { setAppliedAdv({ ...advFilters }); setShowAdvanced(false); }}
                className="active:scale-[0.97]"
                style={{
                  height: 32, borderRadius: 9999, background: "#F3D12A", border: "none",
                  fontSize: 13, fontWeight: 700, color: "#1A1A1A", padding: "0 20px", cursor: "pointer",
                }}
              >Apply</button>
            </div>
          </div>
        )}

        {/* Animal cards */}
        {filtered.map(a => {
          const isExpanded = expandedId === a.id;
          const dk = a.designation_key ? desgMap[a.designation_key] : null;
          const eb = ENTITY_BADGE[a.entity_type] || ENTITY_BADGE.seller;
          const displayTag = a.tag_number || (a.eid ? `…${a.eid.slice(-6)}` : "—");

          return (
            <div
              key={a.id}
              onClick={() => setExpandedId(isExpanded ? null : a.id)}
              className="active:scale-[0.98]"
              style={IS.card}
            >
              {/* Collapsed row */}
              <div style={{ display: "flex", alignItems: "center", gap: 6, minHeight: 24 }}>
                <span style={{
                  fontSize: 14, fontWeight: 600, color: a.tag_number ? "#1A1A1A" : "#717182",
                  fontFamily: a.tag_number ? "Inter, sans-serif" : "monospace",
                  flexShrink: 0,
                }}>{displayTag}</span>

                {dk && (
                  <span style={{
                    display: "inline-flex", alignItems: "center", gap: 4,
                    padding: "2px 8px", borderRadius: 9999,
                    background: `${dk.hex_color}1F`, fontSize: 12, fontWeight: 600, color: dk.hex_color,
                  }}>
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: dk.hex_color }} />
                    {dk.label}
                  </span>
                )}

                <span style={{ fontSize: 12, fontWeight: 500, color: "#717182", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1, minWidth: 0 }}>
                  {a.customer_name}
                </span>

                <span style={{
                  fontSize: 9, fontWeight: 700, textTransform: "uppercase",
                  padding: "3px 8px", borderRadius: 9999,
                  background: eb.bg, color: eb.text, flexShrink: 0,
                }}>{a.entity_type}</span>

                {a.pens?.[0] && (
                  <span style={{ fontSize: 12, fontWeight: 600, color: "#717182", flexShrink: 0 }}>{a.pens[0]}</span>
                )}

                {a.sorted && (
                  <span style={{
                    fontSize: 9, fontWeight: 700, padding: "3px 6px", borderRadius: 9999,
                    background: "rgba(123,104,238,0.12)", color: "#7B68EE", flexShrink: 0,
                  }}>SORTED</span>
                )}
              </div>

              {/* Expanded detail */}
              {isExpanded && (
                <div style={{ marginTop: 10, paddingTop: 8, borderTop: "1px solid rgba(212,212,208,0.30)", display: "flex", flexDirection: "column", gap: 4 }}>
                  <div style={{ fontSize: 13, color: "#717182" }}>EID: <span style={{ fontFamily: "monospace" }}>{a.eid}</span></div>
                  {a.back_tag && <div style={{ fontSize: 13, color: "#717182" }}>Back Tag: {a.back_tag}</div>}
                  {a.eid_2 && <div style={{ fontSize: 13, color: "#717182" }}>EID 2: {a.eid_2}</div>}
                  {a.preg_status && (
                    <span style={{
                      display: "inline-block", fontSize: 12, fontWeight: 600,
                      padding: "3px 10px", borderRadius: 9999, alignSelf: "flex-start",
                      background: a.preg_status.toLowerCase() === "open" ? "rgba(220,38,38,0.10)" : "rgba(85,186,170,0.12)",
                      color: a.preg_status.toLowerCase() === "open" ? "#DC2626" : "#55BAAA",
                    }}>{a.preg_status}</span>
                  )}
                  {(a.sex || a.breed) && (
                    <div style={{ fontSize: 13, color: "#717182" }}>{[a.sex, a.breed].filter(Boolean).join(" · ")}</div>
                  )}
                  <div style={{ fontSize: 13, color: "#717182" }}>Work Type: {a.work_type}</div>

                  {(a.quick_notes?.length ?? 0) > 0 && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 4 }}>
                      {a.quick_notes.map((n, i) => {
                        const colors = i % 3 === 0 ? QUICK_NOTE_PILL_COLORS.teal : i % 3 === 1 ? QUICK_NOTE_PILL_COLORS.gold : QUICK_NOTE_PILL_COLORS.red;
                        return (
                          <span key={i} style={{
                            fontSize: 11, fontWeight: 600, padding: "3px 8px", borderRadius: 9999,
                            background: colors.bg, color: colors.text, display: "flex", alignItems: "center", gap: 4,
                          }}>✓ {n}</span>
                        );
                      })}
                    </div>
                  )}

                  {a.sorted && a.sort_dest_pen && (
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#7B68EE" }}>Sorted to Pen {a.sort_dest_pen}</div>
                  )}

                  <div style={{ fontSize: 11, color: "#717182", marginTop: 2 }}>{fmtTime(a.created_at)}</div>
                </div>
              )}
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div style={{ textAlign: "center", padding: "40px 0", color: "#717182", fontSize: 14 }}>
            No animals match the current filters
          </div>
        )}
      </div>

      {/* Sticky bottom summary bar */}
      <div style={{
        position: "fixed", bottom: 0, left: 0, right: 0,
        background: "#FFFFFF", borderTop: "1px solid #D4D4D0",
        padding: "10px 16px",
        boxShadow: "0 -2px 12px rgba(0,0,0,0.06)",
        display: "flex", alignItems: "center", gap: 12,
        zIndex: 50,
      }}>
        <span style={{ fontSize: 14, fontWeight: 700, color: "#0E2646" }}>{stats.count} head</span>
        <span style={{ fontSize: 12, fontWeight: 500, color: "#717182" }}>{stats.sellers}S / {stats.buyers}B</span>
        <span style={{ fontSize: 12, fontWeight: 500, color: "#7B68EE" }}>{stats.sorted} sorted</span>
      </div>
    </div>
  );
};

export default WorkedAnimalsPage;
