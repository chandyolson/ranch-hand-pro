import React, { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { focusGold, blurReset } from "@/lib/styles";
import type { WorkOrder, SaleBarnCustomer, SaleBarnAnimal } from "@/types/sale-barn";

const fmtDate = (iso: string) => {
  const d = new Date(iso + "T12:00:00");
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
};

const INPUT: React.CSSProperties = {
  flex: 1, minWidth: 0, height: 44, borderRadius: 12,
  border: "1px solid rgba(212,212,208,0.60)", fontSize: 16, padding: "0 12px 0 40px",
  outline: "none", backgroundColor: "#FFFFFF", boxSizing: "border-box",
};

const WorkOrderAnimalsReport: React.FC = () => {
  const { id: saleDayId, woId } = useParams<{ id: string; woId: string }>();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  // Fetch work order
  const { data: wo } = useQuery({
    queryKey: ["wo_report_wo", woId],
    enabled: !!woId,
    queryFn: async () => {
      const { data } = await (supabase.from("work_orders") as any).select("*").eq("id", woId!).single();
      return data as unknown as WorkOrder | null;
    },
  });

  // Fetch customer
  const { data: customer } = useQuery({
    queryKey: ["wo_report_cust", wo?.customer_id],
    enabled: !!wo?.customer_id,
    queryFn: async () => {
      const { data } = await (supabase.from("sale_barn_customers") as any).select("*").eq("id", wo!.customer_id!).single();
      return data as unknown as SaleBarnCustomer | null;
    },
  });

  // Fetch sale day date
  const { data: saleDay } = useQuery({
    queryKey: ["wo_report_sd", saleDayId],
    enabled: !!saleDayId,
    queryFn: async () => {
      const { data } = await (supabase.from("sale_days") as any).select("date").eq("id", saleDayId!).single();
      return data as { date: string } | null;
    },
  });

  // Fetch animals
  const { data: animals } = useQuery({
    queryKey: ["wo_report_animals", woId],
    enabled: !!woId,
    queryFn: async () => {
      const { data } = await (supabase.from("sale_barn_animals") as any)
        .select("*").eq("work_order_id", woId!)
        .order("created_at", { ascending: false });
      return (data ?? []) as unknown as SaleBarnAnimal[];
    },
  });

  const filtered = useMemo(() => {
    if (!animals) return [];
    if (!search.trim()) return animals;
    const q = search.toLowerCase();
    return animals.filter((a) =>
      a.eid?.toLowerCase().includes(q) ||
      a.back_tag?.toLowerCase().includes(q) ||
      a.tag_number?.toLowerCase().includes(q)
    );
  }, [animals, search]);

  const exportCsv = () => {
    const headers = ["EID", "Back Tag", "Tag #", "Designation", "Preg Status", "Sex", "Breed", "Quick Notes", "Sort Dest Pen", "Timestamp"];
    const rows = filtered.map((a) => [
      a.eid, a.back_tag ?? "", a.tag_number ?? "", a.designation_key ?? "",
      a.preg_status ?? "", a.sex ?? "", a.breed ?? "",
      (a.quick_notes ?? []).join("; "), a.sort_dest_pen ?? "",
      new Date(a.created_at).toLocaleString(),
    ]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `animals_${customer?.name?.replace(/\s+/g, "_") ?? "unknown"}_${saleDay?.date ?? "export"}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const customerName = customer?.name ?? "Customer";

  return (
    <div style={{ fontFamily: "Inter, sans-serif", paddingBottom: 120 }}>
      {/* Print styles */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
          .print-header { display: block !important; font-size: 18px; font-weight: 700; margin-bottom: 12px; }
        }
        .print-header { display: none; }
      `}</style>

      {/* Header */}
      <div className="no-print" style={{ padding: "12px 16px", display: "flex", alignItems: "center", gap: 10 }}>
        <button onClick={() => navigate(`/sale-barn/${saleDayId}/work-order/${woId}`)} style={{
          width: 36, height: 36, borderRadius: 9999, border: "1px solid #D4D4D0",
          background: "#FFFFFF", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M11 4L6 9L11 14" stroke="#1A1A1A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, color: "#1A1A1A" }}>Animals Worked</div>
          <div style={{ fontSize: 13, color: "#55BAAA", fontWeight: 500 }}>
            {customerName} · {filtered.length} head
          </div>
        </div>
      </div>

      <div className="print-header">Animals Worked — {customerName} — {saleDay?.date ? fmtDate(saleDay.date) : ""}</div>

      {/* Search */}
      <div className="no-print" style={{ padding: "0 16px", marginBottom: 10, position: "relative" }}>
        <svg style={{ position: "absolute", left: 28, top: 13 }} width="16" height="16" viewBox="0 0 16 16" fill="none">
          <circle cx="7" cy="7" r="4.5" stroke="#717182" strokeWidth="1.3" />
          <path d="M10.5 10.5L14 14" stroke="#717182" strokeWidth="1.3" strokeLinecap="round" />
        </svg>
        <input
          style={INPUT}
          placeholder="Search EID, back tag, or tag #..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onFocus={focusGold} onBlur={blurReset}
        />
        {search && (
          <button onClick={() => setSearch("")} style={{
            position: "absolute", right: 28, top: 12, background: "none", border: "none",
            cursor: "pointer", fontSize: 16, color: "#717182",
          }}>×</button>
        )}
      </div>

      {/* Animal Cards */}
      <div style={{ padding: "0 16px" }}>
        {filtered.map((a) => {
          const isExpanded = expanded === a.id;
          const displayTag = a.tag_number || (a.eid ? a.eid.slice(-6) : "—");
          const isEidFallback = !a.tag_number;

          return (
            <div
              key={a.id}
              onClick={() => setExpanded(isExpanded ? null : a.id)}
              style={{
                background: "#FFFFFF", borderRadius: 10,
                border: "1px solid rgba(212,212,208,0.60)",
                padding: "10px 14px", marginBottom: 6, cursor: "pointer",
              }}
            >
              {/* Collapsed row */}
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <span style={{
                  fontSize: 14, fontWeight: 600, color: "#1A1A1A",
                  fontFamily: isEidFallback ? "monospace" : "Inter, sans-serif",
                  ...(isEidFallback ? { fontWeight: 500, color: "#717182" } : {}),
                }}>
                  {displayTag}
                </span>

                {a.designation_key && (
                  <span style={{
                    fontSize: 12, fontWeight: 600, borderRadius: 9999,
                    padding: "2px 8px", background: "rgba(14,38,70,0.06)",
                    display: "flex", alignItems: "center", gap: 4,
                  }}>
                    <span style={{ width: 8, height: 8, borderRadius: 4, background: "#0E2646", flexShrink: 0 }} />
                    {a.designation_key}
                  </span>
                )}

                {a.preg_status && (
                  <span style={{
                    fontSize: 11, fontWeight: 600, borderRadius: 9999, padding: "2px 8px",
                    background: "rgba(85,186,170,0.12)", color: "#55BAAA",
                  }}>
                    {a.preg_status}
                  </span>
                )}

                <span style={{ fontSize: 12, color: "#717182", marginLeft: "auto" }}>
                  {a.sort_dest_pen ?? ""}
                </span>
              </div>

              {/* Expanded detail */}
              {isExpanded && (
                <div style={{ marginTop: 8, borderTop: "1px solid rgba(212,212,208,0.30)", paddingTop: 8 }}>
                  {a.eid && <div style={{ fontSize: 13, color: "#717182", marginBottom: 2 }}>EID: {a.eid}</div>}
                  {a.back_tag && <div style={{ fontSize: 13, color: "#717182", marginBottom: 2 }}>Back Tag: {a.back_tag}</div>}
                  {a.eid_2 && <div style={{ fontSize: 13, color: "#717182", marginBottom: 2 }}>EID 2: {a.eid_2}</div>}
                  {(a.sex || a.breed) && (
                    <div style={{ fontSize: 13, color: "#717182", marginBottom: 2 }}>
                      {[a.sex, a.breed].filter(Boolean).join(" · ")}
                    </div>
                  )}
                  {a.quick_notes && a.quick_notes.length > 0 && (
                    <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 4 }}>
                      {a.quick_notes.map((qn, i) => (
                        <span key={i} style={{
                          fontSize: 11, fontWeight: 600, borderRadius: 9999, padding: "2px 8px",
                          background: i % 3 === 0 ? "rgba(212,24,61,0.08)" : i % 3 === 1 ? "rgba(243,209,42,0.12)" : "rgba(85,186,170,0.12)",
                          color: i % 3 === 0 ? "#D4183D" : i % 3 === 1 ? "#B8860B" : "#55BAAA",
                        }}>{qn}</span>
                      ))}
                    </div>
                  )}
                  {a.sorted && a.sort_dest_pen && (
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#7B68EE", marginTop: 4 }}>
                      Sorted to Pen {a.sort_dest_pen}
                    </div>
                  )}
                  <div style={{ fontSize: 11, color: "#717182", marginTop: 4 }}>
                    {new Date(a.created_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div style={{ textAlign: "center", padding: 40, color: "#717182", fontSize: 14 }}>
            {search ? "No animals match your search" : "No animals worked yet"}
          </div>
        )}
      </div>

      {/* Export buttons */}
      <div className="no-print" style={{ padding: "16px 16px 0" }}>
        <button
          onClick={exportCsv}
          className="active:scale-[0.97]"
          style={{
            width: "100%", height: 44, borderRadius: 9999,
            border: "1.5px solid #0E2646", background: "#FFFFFF",
            color: "#0E2646", fontSize: 14, fontWeight: 600, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
          }}
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
            <path d="M8 2v8M5 7l3 3 3-3M3 12h10" stroke="#0E2646" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Export CSV
        </button>
        <button
          onClick={() => window.print()}
          className="active:scale-[0.97]"
          style={{
            width: "100%", height: 44, borderRadius: 9999, marginTop: 8,
            border: "1.5px solid #717182", background: "#FFFFFF",
            color: "#717182", fontSize: 14, fontWeight: 600, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
          }}
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
            <path d="M4 6V2h8v4M4 12H2.667A.667.667 0 0 1 2 11.333V8.667A.667.667 0 0 1 2.667 8h10.666a.667.667 0 0 1 .667.667v2.666a.667.667 0 0 1-.667.667H12M4 10h8v4H4v-4z"
              stroke="#717182" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Export PDF
        </button>
      </div>
    </div>
  );
};

export default WorkOrderAnimalsReport;
