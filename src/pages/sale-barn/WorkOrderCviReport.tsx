import React, { useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { WorkOrder, SaleBarnCustomer, SaleBarnAnimal } from "@/types/sale-barn";

const fmtDate = (iso: string) => {
  const d = new Date(iso + "T12:00:00");
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
};

const WorkOrderCviReport: React.FC = () => {
  const { id: saleDayId, woId } = useParams<{ id: string; woId: string }>();
  const navigate = useNavigate();

  const { data: wo } = useQuery({
    queryKey: ["cvi_wo", woId],
    enabled: !!woId,
    queryFn: async () => {
      const { data } = await (supabase.from("work_orders") as any).select("*").eq("id", woId!).single();
      return data as unknown as WorkOrder | null;
    },
  });

  const { data: customer } = useQuery({
    queryKey: ["cvi_cust", wo?.customer_id],
    enabled: !!wo?.customer_id,
    queryFn: async () => {
      const { data } = await (supabase.from("sale_barn_customers") as any).select("*").eq("id", wo!.customer_id!).single();
      return data as unknown as SaleBarnCustomer | null;
    },
  });

  const { data: saleDay } = useQuery({
    queryKey: ["cvi_sd", saleDayId],
    enabled: !!saleDayId,
    queryFn: async () => {
      const { data } = await (supabase.from("sale_days") as any).select("date").eq("id", saleDayId!).single();
      return data as { date: string } | null;
    },
  });

  const { data: animals } = useQuery({
    queryKey: ["cvi_animals", woId],
    enabled: !!woId,
    queryFn: async () => {
      const { data } = await (supabase.from("sale_barn_animals") as any)
        .select("*").eq("work_order_id", woId!)
        .order("created_at", { ascending: true });
      return (data ?? []) as unknown as SaleBarnAnimal[];
    },
  });

  // Group by sex/breed for summary
  const summary = useMemo(() => {
    if (!animals) return { total: 0, bySex: {} as Record<string, number>, byBreed: {} as Record<string, number>, eids: [] as string[] };
    const bySex: Record<string, number> = {};
    const byBreed: Record<string, number> = {};
    const eids: string[] = [];
    animals.forEach((a) => {
      const sex = a.sex || "Unknown";
      const breed = a.breed || "Unknown";
      bySex[sex] = (bySex[sex] || 0) + 1;
      byBreed[breed] = (byBreed[breed] || 0) + 1;
      if (a.eid) eids.push(a.eid);
    });
    return { total: animals.length, bySex, byBreed, eids };
  }, [animals]);

  const exportCsv = () => {
    const headers = ["EID", "Back Tag", "Tag #", "Sex", "Breed", "Preg Status"];
    const rows = (animals ?? []).map((a) => [
      a.eid, a.back_tag ?? "", a.tag_number ?? "", a.sex ?? "", a.breed ?? "", a.preg_status ?? "",
    ]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cvi_${customer?.name?.replace(/\s+/g, "_") ?? "unknown"}_${saleDay?.date ?? "export"}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const customerName = customer?.name ?? "Customer";

  return (
    <div style={{ fontFamily: "Inter, sans-serif", paddingBottom: 120 }}>
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
          <div style={{ fontSize: 18, fontWeight: 700, color: "#1A1A1A" }}>Health Certificate</div>
          <div style={{ fontSize: 13, color: "#55BAAA", fontWeight: 500 }}>CVI Prep Sheet</div>
        </div>
      </div>

      <div className="print-header">Health Certificate — {customerName} — {saleDay?.date ? fmtDate(saleDay.date) : ""}</div>

      <div style={{ padding: "0 16px" }}>
        {/* Consignee / Buyer Info */}
        <div style={{
          background: "#FFFFFF", borderRadius: 12,
          border: "1px solid rgba(212,212,208,0.60)",
          padding: "14px 16px", marginBottom: 10,
        }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: "rgba(26,26,26,0.40)", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 8 }}>
            CONSIGNEE / BUYER
          </div>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#1A1A1A", marginBottom: 4 }}>{customerName}</div>
          {customer?.state && <div style={{ fontSize: 13, color: "#717182" }}>State: {customer.state}</div>}
          {customer?.phone && <div style={{ fontSize: 13, color: "#717182" }}>Phone: {customer.phone}</div>}
          {customer?.address && <div style={{ fontSize: 13, color: "#717182" }}>Address: {customer.address}</div>}
          {wo?.buyer_num && <div style={{ fontSize: 13, color: "#717182", marginTop: 4 }}>Buyer #: {wo.buyer_num}</div>}
        </div>

        {/* Shipment Summary */}
        <div style={{
          background: "#FFFFFF", borderRadius: 12,
          border: "1px solid rgba(212,212,208,0.60)",
          padding: "14px 16px", marginBottom: 10,
        }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: "rgba(26,26,26,0.40)", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 8 }}>
            SHIPMENT SUMMARY
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 16px" }}>
            <div>
              <div style={{ fontSize: 11, color: "#717182" }}>Total Head</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: "#0E2646" }}>{summary.total}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: "#717182" }}>Work Type</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: "#1A1A1A" }}>{wo?.work_type ?? "—"}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: "#717182" }}>Animal Type</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: "#1A1A1A" }}>{wo?.animal_type ?? "—"}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: "#717182" }}>Date</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: "#1A1A1A" }}>{saleDay?.date ? fmtDate(saleDay.date) : "—"}</div>
            </div>
          </div>

          {/* Breakdown by sex */}
          {Object.keys(summary.bySex).length > 0 && (
            <div style={{ marginTop: 10, borderTop: "1px solid rgba(212,212,208,0.30)", paddingTop: 8 }}>
              <div style={{ fontSize: 11, color: "#717182", marginBottom: 4 }}>By Sex</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {Object.entries(summary.bySex).map(([sex, count]) => (
                  <span key={sex} style={{
                    fontSize: 12, fontWeight: 600, borderRadius: 9999, padding: "3px 10px",
                    background: "rgba(14,38,70,0.06)", color: "#0E2646",
                  }}>
                    {count} {sex}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Breakdown by breed */}
          {Object.keys(summary.byBreed).length > 0 && (
            <div style={{ marginTop: 8, borderTop: "1px solid rgba(212,212,208,0.30)", paddingTop: 8 }}>
              <div style={{ fontSize: 11, color: "#717182", marginBottom: 4 }}>By Breed</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {Object.entries(summary.byBreed).map(([breed, count]) => (
                  <span key={breed} style={{
                    fontSize: 12, fontWeight: 600, borderRadius: 9999, padding: "3px 10px",
                    background: "rgba(85,186,170,0.08)", color: "#55BAAA",
                  }}>
                    {count} {breed}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* EID List */}
        <div style={{
          background: "#FFFFFF", borderRadius: 12,
          border: "1px solid rgba(212,212,208,0.60)",
          padding: "14px 16px", marginBottom: 10,
        }}>
          <div style={{
            fontSize: 10, fontWeight: 600, color: "rgba(26,26,26,0.40)",
            letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 8,
          }}>
            EID LIST ({summary.eids.length})
          </div>
          {summary.eids.length > 0 ? (
            <div style={{ fontFamily: "monospace", fontSize: 13, color: "#1A1A1A", lineHeight: 1.6 }}>
              {summary.eids.map((eid, i) => (
                <div key={i} style={{
                  padding: "4px 0",
                  borderBottom: i < summary.eids.length - 1 ? "1px solid rgba(212,212,208,0.20)" : "none",
                }}>
                  {eid}
                </div>
              ))}
            </div>
          ) : (
            <div style={{ fontSize: 13, color: "#717182", textAlign: "center", padding: 12 }}>
              No EIDs recorded
            </div>
          )}
        </div>

        {/* Pen info */}
        {wo?.pens && wo.pens.length > 0 && (
          <div style={{
            background: "#FFFFFF", borderRadius: 12,
            border: "1px solid rgba(212,212,208,0.60)",
            padding: "14px 16px", marginBottom: 10,
          }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: "rgba(26,26,26,0.40)", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 4 }}>
              PENS
            </div>
            <div style={{ fontSize: 14, fontWeight: 600, color: "#1A1A1A" }}>{wo.pens.join(", ")}</div>
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
          Print Report
        </button>
      </div>
    </div>
  );
};

export default WorkOrderCviReport;
