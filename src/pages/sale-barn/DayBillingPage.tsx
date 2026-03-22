import React, { useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useChuteSideToast as useToast } from "@/components/ToastContext";
import type { SaleDay, WorkOrder } from "@/types/sale-barn";

const fmtDate = (iso: string) => {
  const d = new Date(iso + "T12:00:00");
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
};

const fmtCurrency = (n: number) =>
  `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const ChevronLeft = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M12.5 15L7.5 10L12.5 5" stroke="#1A1A1A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
);
const DownloadIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
);
const PrinterIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
);

const ENTITY_BADGE: Record<string, { bg: string; text: string }> = {
  seller: { bg: "rgba(243,209,42,0.12)", text: "#B8860B" },
  buyer: { bg: "rgba(85,186,170,0.15)", text: "#55BAAA" },
};

const DayBillingPage: React.FC = () => {
  const { id: saleDayId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const { data: saleDay } = useQuery({
    queryKey: ["billing_sale_day", saleDayId],
    queryFn: async () => {
      const { data } = await (supabase.from("sale_days" as any)).select("*").eq("id", saleDayId).single();
      return data as unknown as SaleDay;
    },
  });

  const { data: workOrders = [] } = useQuery({
    queryKey: ["billing_work_orders", saleDayId],
    enabled: !!saleDayId,
    queryFn: async () => {
      const { data } = await (supabase.from("work_orders" as any)).select("*").eq("sale_day_id", saleDayId);
      return (data ?? []) as unknown as WorkOrder[];
    },
  });

  const customerIds = useMemo(() => [...new Set(workOrders.map(w => w.customer_id).filter(Boolean))] as string[], [workOrders]);

  const { data: customerMap = {} } = useQuery({
    queryKey: ["billing_customers", customerIds],
    enabled: customerIds.length > 0,
    queryFn: async () => {
      const { data } = await (supabase.from("sale_barn_customers" as any)).select("id, name").in("id", customerIds);
      return Object.fromEntries((data ?? []).map((c: any) => [c.id, c.name])) as Record<string, string>;
    },
  });

  const getName = (wo: WorkOrder) =>
    (wo.customer_id && customerMap[wo.customer_id]) || (wo.buyer_num ? `#${wo.buyer_num}` : "No Customer");

  const totals = useMemo(() => {
    const s = { sellerVet: 0, buyerVet: 0, sellerAdmin: 0, buyerAdmin: 0, sellerSol: 0, buyerSol: 0, sellerTotal: 0, buyerTotal: 0 };
    workOrders.forEach(wo => {
      const vetTax = (wo.vet_charge || 0) + (wo.tax_charge || 0);
      if (wo.entity_type === "seller") {
        s.sellerVet += vetTax; s.sellerAdmin += wo.admin_charge || 0; s.sellerSol += wo.sol_charge || 0; s.sellerTotal += wo.total_charge || 0;
      } else {
        s.buyerVet += vetTax; s.buyerAdmin += wo.admin_charge || 0; s.buyerSol += wo.sol_charge || 0; s.buyerTotal += wo.total_charge || 0;
      }
    });
    return { ...s, grandTotal: s.sellerTotal + s.buyerTotal };
  }, [workOrders]);

  const sorted = useMemo(() =>
    [...workOrders].sort((a, b) => {
      if (a.entity_type !== b.entity_type) return a.entity_type === "seller" ? -1 : 1;
      return getName(a).localeCompare(getName(b));
    }),
    [workOrders, customerMap]
  );

  const exportCSV = () => {
    const headers = ["Customer", "Type", "Work Type", "Animal Type", "Head Count", "Pens", "Vet Charge", "Tax", "Admin", "SOL", "Total", "Special Lump Sum"];
    const rows = sorted.map(wo => [
      getName(wo), wo.entity_type, wo.work_type, wo.animal_type || "", wo.head_count,
      (wo.pens || []).join("; "), wo.vet_charge, wo.tax_charge, wo.admin_charge, wo.sol_charge,
      wo.total_charge, wo.special_lump_sum || 0,
    ]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `day_billing_${saleDay?.date || "export"}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("success", "CSV downloaded");
  };

  const gridStyle: React.CSSProperties = {
    display: "grid", gridTemplateColumns: "1.2fr 0.8fr 0.8fr 0.8fr", gap: "4px 10px", alignItems: "baseline",
  };

  const headerLabel: React.CSSProperties = {
    fontSize: 10, fontWeight: 600, color: "rgba(26,26,26,0.40)", textTransform: "uppercase", letterSpacing: "0.06em",
  };

  const cellStyle: React.CSSProperties = { fontSize: 13, fontWeight: 400, color: "#1A1A1A", textAlign: "right" };
  const labelCell: React.CSSProperties = { fontSize: 13, fontWeight: 400, color: "#1A1A1A" };

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .print-header { display: block !important; font-size: 18px; font-weight: 700; text-align: center; margin-bottom: 12px; }
          body { background: white !important; }
        }
        .print-header { display: none; }
      `}</style>

      <div style={{ fontFamily: "Inter, sans-serif", background: "#F5F5F0", minHeight: "100vh" }}>
        {/* Header */}
        <div className="no-print" style={{ background: "#FFFFFF", padding: "14px 16px 12px", borderBottom: "1px solid rgba(212,212,208,0.40)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button onClick={() => navigate(`/sale-barn/${saleDayId}`)} style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}>
              <ChevronLeft />
            </button>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: "#0E2646" }}>Day Billing</div>
              <div style={{ fontSize: 12, fontWeight: 500, color: "#55BAAA" }}>{saleDay ? fmtDate(saleDay.date) : "Loading..."}</div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={exportCSV} className="active:scale-[0.97]" style={{
                height: 36, borderRadius: 9999, border: "1.5px solid #0E2646", background: "#FFFFFF",
                color: "#0E2646", fontSize: 13, fontWeight: 600, padding: "0 14px", cursor: "pointer",
                display: "flex", alignItems: "center", gap: 6,
              }}><DownloadIcon /> Export</button>
              <button onClick={() => window.print()} className="active:scale-[0.97]" style={{
                height: 36, borderRadius: 9999, border: "1.5px solid #717182", background: "#FFFFFF",
                color: "#717182", fontSize: 13, fontWeight: 600, padding: "0 14px", cursor: "pointer",
                display: "flex", alignItems: "center", gap: 6,
              }}><PrinterIcon /> Print</button>
            </div>
          </div>
        </div>

        <div className="print-header">Day Billing — {saleDay ? fmtDate(saleDay.date) : ""}</div>

        <div style={{ padding: "12px 16px" }}>
          {/* Billing summary card */}
          <div style={{
            background: "#FFFFFF", borderRadius: 12, border: "1px solid rgba(212,212,208,0.60)",
            padding: "14px 16px", marginBottom: 12,
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 12 }}>
              <span style={{ fontSize: 16, fontWeight: 700, color: "#0E2646" }}>Day Billing</span>
              <span style={{ fontSize: 18, fontWeight: 700, color: "#55BAAA" }}>{fmtCurrency(totals.grandTotal)}</span>
            </div>

            <div style={gridStyle}>
              <span />
              <span style={{ ...headerLabel, textAlign: "right" }}>Seller</span>
              <span style={{ ...headerLabel, textAlign: "right" }}>Buyer</span>
              <span style={{ ...headerLabel, textAlign: "right", color: "#55BAAA" }}>Total</span>

              <span style={labelCell}>Vet</span>
              <span style={cellStyle}>{fmtCurrency(totals.sellerVet)}</span>
              <span style={cellStyle}>{fmtCurrency(totals.buyerVet)}</span>
              <span style={{ ...cellStyle, color: "#55BAAA" }}>{fmtCurrency(totals.sellerVet + totals.buyerVet)}</span>

              <span style={labelCell}>Admin 5%</span>
              <span style={cellStyle}>{fmtCurrency(totals.sellerAdmin)}</span>
              <span style={cellStyle}>{fmtCurrency(totals.buyerAdmin)}</span>
              <span style={{ ...cellStyle, color: "#55BAAA" }}>{fmtCurrency(totals.sellerAdmin + totals.buyerAdmin)}</span>

              <span style={labelCell}>SOL</span>
              <span style={cellStyle}>{fmtCurrency(totals.sellerSol)}</span>
              <span style={cellStyle}>{fmtCurrency(totals.buyerSol)}</span>
              <span style={{ ...cellStyle, color: "#55BAAA" }}>{fmtCurrency(totals.sellerSol + totals.buyerSol)}</span>
            </div>

            <div style={{ height: 1, background: "rgba(212,212,208,0.30)", margin: "6px 0" }} />

            <div style={gridStyle}>
              <span style={{ fontSize: 13, fontWeight: 700, color: "#0E2646" }}>Total</span>
              <span style={{ ...cellStyle, fontWeight: 700 }}>{fmtCurrency(totals.sellerTotal)}</span>
              <span style={{ ...cellStyle, fontWeight: 700 }}>{fmtCurrency(totals.buyerTotal)}</span>
              <span style={{ ...cellStyle, fontSize: 15, fontWeight: 700, color: "#55BAAA" }}>{fmtCurrency(totals.grandTotal)}</span>
            </div>
          </div>

          {/* By Work Order */}
          <div style={{ fontSize: 14, fontWeight: 700, color: "#0E2646", marginTop: 16, marginBottom: 10 }}>By Work Order</div>

          {sorted.map(wo => {
            const eb = ENTITY_BADGE[wo.entity_type] || ENTITY_BADGE.seller;
            const vetTax = (wo.vet_charge || 0) + (wo.tax_charge || 0);
            const hasSpecial = (wo.special_lump_sum || 0) > 0;
            const metaParts = [wo.work_type, wo.animal_type, wo.head_count ? `${wo.head_count} hd` : null, wo.pens?.length ? `Pen ${wo.pens.join(", ")}` : null].filter(Boolean).join(" · ");

            return (
              <div key={wo.id} style={{
                background: "#0E2646", borderRadius: 12, padding: "12px 14px", marginBottom: 8,
              }}>
                {/* Row 1 */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 15, fontWeight: 600, color: "#F0F0F0" }}>{getName(wo)}</span>
                  <span style={{
                    fontSize: 9, fontWeight: 700, textTransform: "uppercase",
                    padding: "3px 8px", borderRadius: 9999, background: eb.bg, color: eb.text,
                  }}>{wo.entity_type}</span>
                </div>
                {/* Row 2 */}
                <div style={{ fontSize: 13, fontWeight: 400, color: "rgba(240,240,240,0.65)", marginTop: 4 }}>{metaParts}</div>
                {/* Row 3 billing */}
                <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 3 }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ fontSize: 12, color: "rgba(240,240,240,0.55)" }}>Vet + Tax</span>
                    <span style={{ fontSize: 12, color: "rgba(240,240,240,0.55)" }}>{fmtCurrency(vetTax)}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ fontSize: 12, color: "rgba(240,240,240,0.55)" }}>Admin</span>
                    <span style={{ fontSize: 12, color: "rgba(240,240,240,0.55)" }}>{fmtCurrency(wo.admin_charge || 0)}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ fontSize: 12, color: "rgba(240,240,240,0.55)" }}>SOL</span>
                    <span style={{ fontSize: 12, color: "rgba(240,240,240,0.55)" }}>{fmtCurrency(wo.sol_charge || 0)}</span>
                  </div>
                  {hasSpecial && (
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: 12, color: "rgba(240,240,240,0.55)", display: "flex", alignItems: "center", gap: 4 }}>
                        Special
                        <span style={{ fontSize: 9, fontWeight: 700, color: "#55BAAA", background: "rgba(85,186,170,0.15)", padding: "2px 6px", borderRadius: 9999 }}>CALC</span>
                      </span>
                      <span style={{ fontSize: 12, color: "rgba(240,240,240,0.55)" }}>{fmtCurrency(wo.special_lump_sum)}</span>
                    </div>
                  )}
                  <div style={{ height: 1, background: "rgba(255,255,255,0.10)", margin: "3px 0" }} />
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: "#55BAAA" }}>Total</span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: "#55BAAA" }}>{fmtCurrency(wo.total_charge || 0)}</span>
                  </div>
                </div>
              </div>
            );
          })}

          {workOrders.length === 0 && (
            <div style={{ textAlign: "center", padding: "40px 0", color: "#717182", fontSize: 14 }}>No work orders for this sale day</div>
          )}
        </div>
      </div>
    </>
  );
};

export default DayBillingPage;
