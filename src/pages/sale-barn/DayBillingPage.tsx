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
const fmtToday = () => new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
const fmtCurrency = (n: number) => `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtRounded = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;

const ChevronLeft = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M12.5 15L7.5 10L12.5 5" stroke="#1A1A1A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
);
const DownloadIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
);
const PrinterIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
);

const SectionLabel: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = "" }) => (
  <div className={`section-label ${className}`} style={{ fontSize: 11, fontWeight: 500, color: "#717182", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>{children}</div>
);

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

  // Head count summary
  const headCounts = useMemo(() => {
    const sellerHd = workOrders.filter(w => w.entity_type === "seller").reduce((s, w) => s + (w.head_count || 0), 0);
    const buyerHd = workOrders.filter(w => w.entity_type === "buyer").reduce((s, w) => s + (w.head_count || 0), 0);
    const sellerCount = workOrders.filter(w => w.entity_type === "seller").length;
    const buyerCount = workOrders.filter(w => w.entity_type === "buyer").length;
    return { sellerHd, buyerHd, sellerCount, buyerCount, totalHd: sellerHd + buyerHd };
  }, [workOrders]);

  // Revenue summary
  const revenue = useMemo(() => {
    const calc = (type: string) => {
      const wos = workOrders.filter(w => w.entity_type === type);
      return {
        vetTax: wos.reduce((s, w) => s + (w.vet_charge || 0) + (w.tax_charge || 0), 0),
        admin: wos.reduce((s, w) => s + (w.admin_charge || 0), 0),
        sol: wos.reduce((s, w) => s + (w.sol_charge || 0), 0),
        total: wos.reduce((s, w) => s + (w.total_charge || 0), 0),
      };
    };
    const s = calc("seller"), b = calc("buyer");
    return { seller: s, buyer: b, grandTotal: s.total + b.total };
  }, [workOrders]);

  // Head count by work type
  const workTypeSummary = useMemo(() => {
    const map: Record<string, { seller: number; buyer: number }> = {};
    workOrders.forEach(wo => {
      const key = wo.work_type || "Other";
      if (!map[key]) map[key] = { seller: 0, buyer: 0 };
      map[key][wo.entity_type] += wo.head_count || 0;
    });
    return Object.entries(map)
      .map(([type, counts]) => ({ type, ...counts, total: counts.seller + counts.buyer }))
      .sort((a, b) => b.total - a.total);
  }, [workOrders]);

  // Sorted work orders for detail table
  const sorted = useMemo(() =>
    [...workOrders].sort((a, b) => {
      if (a.entity_type !== b.entity_type) return a.entity_type === "seller" ? -1 : 1;
      return getName(a).localeCompare(getName(b));
    }),
    [workOrders, customerMap]
  );

  const detailTotals = useMemo(() => ({
    hd: sorted.reduce((s, w) => s + (w.head_count || 0), 0),
    vetTax: sorted.reduce((s, w) => s + (w.vet_charge || 0) + (w.tax_charge || 0), 0),
    admin: sorted.reduce((s, w) => s + (w.admin_charge || 0), 0),
    sol: sorted.reduce((s, w) => s + (w.sol_charge || 0), 0),
    total: sorted.reduce((s, w) => s + (w.total_charge || 0), 0),
  }), [sorted]);

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

  const thStyle: React.CSSProperties = { fontSize: 11, fontWeight: 500, color: "#717182", textAlign: "right", padding: "5px 6px", borderBottom: "1px solid rgba(26,26,26,0.15)" };
  const thStyleLeft: React.CSSProperties = { ...thStyle, textAlign: "left" };
  const tdStyle: React.CSSProperties = { fontSize: 12, color: "#1A1A1A", textAlign: "right", padding: "4px 6px", borderBottom: "0.5px solid rgba(26,26,26,0.08)" };
  const tdStyleLeft: React.CSSProperties = { ...tdStyle, textAlign: "left" };

  return (
    <>
      <style>{`
        @media print {
          header, nav, .no-print, .sticky-bar, .export-buttons,
          .back-arrow, [data-no-print] { display: none !important; }
          body, * { background: white !important; color: black !important; -webkit-print-color-adjust: exact; }
          .alt-row { background: #F5F5F5 !important; }
          table { border-collapse: collapse; }
          td, th { border-color: #DDD !important; }
          @page { margin: 0.5in; }
          table { page-break-inside: auto; }
          tr { page-break-inside: avoid; }
          .section-label { page-break-after: avoid; }
          .summary-section { page-break-inside: avoid; }
          .work-type-table { page-break-inside: avoid; }
          .detail-table { page-break-inside: auto; }
          .detail-table thead { display: table-header-group; }
        }
        .billing-report { font-family: Inter, sans-serif; background: #F5F5F0; min-height: 100vh; }
        @media print { .billing-report { background: white !important; min-height: auto; } }
      `}</style>

      <div className="billing-report">
        {/* Screen header */}
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

        {/* Print report body */}
        <div style={{ padding: "16px 16px 40px", maxWidth: 800, margin: "0 auto" }}>

          {/* Print header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ fontSize: 20, fontWeight: 500, color: "#1A1A1A" }}>Day Billing Report</div>
              <div style={{ fontSize: 13, fontWeight: 400, color: "#717182" }}>
                {saleDay ? fmtDate(saleDay.date) : ""} · St. Onge Livestock
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 11, fontWeight: 400, color: "#717182" }}>CATL Resources</div>
              <div style={{ fontSize: 11, fontWeight: 400, color: "#717182" }}>Printed {fmtToday()}</div>
            </div>
          </div>

          <div style={{ height: 1, background: "rgba(26,26,26,0.15)", margin: "12px 0" }} />

          {/* Section 1: Two-column summary */}
          <div className="summary-section" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
            {/* Head count summary */}
            <div>
              <SectionLabel>Head Count Summary</SectionLabel>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <tbody>
                  {[
                    ["Seller head", headCounts.sellerHd],
                    ["Buyer head", headCounts.buyerHd],
                    ["Sellers", headCounts.sellerCount],
                    ["Buyers", headCounts.buyerCount],
                  ].map(([label, val], i) => (
                    <tr key={i}>
                      <td style={{ fontSize: 13, fontWeight: 400, color: "#717182", padding: "5px 0", borderBottom: "0.5px solid rgba(26,26,26,0.08)" }}>{label}</td>
                      <td style={{ fontSize: 13, fontWeight: 500, color: "#1A1A1A", padding: "5px 0", borderBottom: "0.5px solid rgba(26,26,26,0.08)", textAlign: "right" }}>{val}</td>
                    </tr>
                  ))}
                  <tr>
                    <td style={{ fontSize: 15, fontWeight: 500, color: "#1A1A1A", padding: "5px 0" }}>Total head</td>
                    <td style={{ fontSize: 15, fontWeight: 500, color: "#1A1A1A", padding: "5px 0", textAlign: "right" }}>{headCounts.totalHd}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Revenue summary */}
            <div>
              <SectionLabel>Revenue Summary</SectionLabel>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <th style={thStyleLeft}></th>
                    <th style={thStyle}>Seller</th>
                    <th style={thStyle}>Buyer</th>
                    <th style={thStyle}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ["Vet + tax", revenue.seller.vetTax, revenue.buyer.vetTax],
                    ["Admin 5%", revenue.seller.admin, revenue.buyer.admin],
                    ["SOL", revenue.seller.sol, revenue.buyer.sol],
                  ].map(([label, s, b], i) => (
                    <tr key={i}>
                      <td style={{ fontSize: 13, fontWeight: 400, color: "#717182", padding: "5px 0", borderBottom: "0.5px solid rgba(26,26,26,0.08)" }}>{label}</td>
                      <td style={{ ...tdStyle }}>{fmtRounded(s as number)}</td>
                      <td style={{ ...tdStyle }}>{fmtRounded(b as number)}</td>
                      <td style={{ ...tdStyle }}>{fmtRounded((s as number) + (b as number))}</td>
                    </tr>
                  ))}
                  <tr>
                    <td style={{ fontSize: 15, fontWeight: 500, color: "#1A1A1A", padding: "5px 0" }}>Total</td>
                    <td style={{ fontSize: 13, fontWeight: 500, color: "#1A1A1A", padding: "5px 0", textAlign: "right" }}>{fmtRounded(revenue.seller.total)}</td>
                    <td style={{ fontSize: 13, fontWeight: 500, color: "#1A1A1A", padding: "5px 0", textAlign: "right" }}>{fmtRounded(revenue.buyer.total)}</td>
                    <td style={{ fontSize: 15, fontWeight: 500, color: "#1A1A1A", padding: "5px 0", textAlign: "right" }}>{fmtRounded(revenue.grandTotal)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div style={{ height: 1, background: "rgba(26,26,26,0.15)", margin: "12px 0" }} />

          {/* Section 2: Head count by work type */}
          <div className="work-type-table" style={{ marginBottom: 16 }}>
            <SectionLabel>Head Count by Work Type</SectionLabel>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={thStyleLeft}>Work type</th>
                  <th style={thStyle}>Sellers</th>
                  <th style={thStyle}>Buyers</th>
                  <th style={thStyle}>Total hd</th>
                </tr>
              </thead>
              <tbody>
                {workTypeSummary.map((row, i) => (
                  <tr key={i}>
                    <td style={tdStyleLeft}>{row.type}</td>
                    <td style={tdStyle}>{row.seller || "—"}</td>
                    <td style={tdStyle}>{row.buyer || "—"}</td>
                    <td style={tdStyle}>{row.total}</td>
                  </tr>
                ))}
                <tr>
                  <td style={{ fontSize: 12, fontWeight: 500, color: "#1A1A1A", padding: "5px 6px", borderTop: "1px solid rgba(26,26,26,0.15)" }}>Total</td>
                  <td style={{ ...tdStyle, fontWeight: 500, borderTop: "1px solid rgba(26,26,26,0.15)" }}>{workTypeSummary.reduce((s, r) => s + r.seller, 0)}</td>
                  <td style={{ ...tdStyle, fontWeight: 500, borderTop: "1px solid rgba(26,26,26,0.15)" }}>{workTypeSummary.reduce((s, r) => s + r.buyer, 0)}</td>
                  <td style={{ ...tdStyle, fontWeight: 500, borderTop: "1px solid rgba(26,26,26,0.15)" }}>{workTypeSummary.reduce((s, r) => s + r.total, 0)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div style={{ height: 1, background: "rgba(26,26,26,0.15)", margin: "12px 0" }} />

          {/* Section 3: Work order detail */}
          <div>
            <SectionLabel>Work Order Detail</SectionLabel>
            <table className="detail-table" style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={thStyleLeft}>Customer</th>
                  <th style={{ ...thStyle, textAlign: "center", width: 28 }}>Type</th>
                  <th style={thStyleLeft}>Work</th>
                  <th style={{ ...thStyle, width: 32 }}>Hd</th>
                  <th style={{ ...thStyle, width: 40 }}>Pen</th>
                  <th style={thStyle}>Vet+Tax</th>
                  <th style={thStyle}>Adm</th>
                  <th style={thStyle}>SOL</th>
                  <th style={thStyle}>Total</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((wo, i) => {
                  const isAlt = i % 2 === 1;
                  const isBuyer = wo.entity_type === "buyer";
                  return (
                    <tr key={wo.id} className={isAlt ? "alt-row" : ""} style={{ background: isAlt ? "#F9F9F6" : "white" }}>
                      <td style={{ ...tdStyleLeft, fontSize: 11, maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{getName(wo)}</td>
                      <td style={{ ...tdStyle, textAlign: "center", fontWeight: isBuyer ? 600 : 400, color: isBuyer ? "#0E2646" : "#717182" }}>{isBuyer ? "B" : "S"}</td>
                      <td style={{ ...tdStyleLeft, fontSize: 11 }}>{wo.work_type}</td>
                      <td style={tdStyle}>{wo.head_count}</td>
                      <td style={{ ...tdStyle, fontSize: 11 }}>{wo.pens?.[0] || "—"}</td>
                      <td style={tdStyle}>{fmtCurrency((wo.vet_charge || 0) + (wo.tax_charge || 0))}</td>
                      <td style={tdStyle}>{fmtCurrency(wo.admin_charge || 0)}</td>
                      <td style={tdStyle}>{fmtCurrency(wo.sol_charge || 0)}</td>
                      <td style={{ ...tdStyle, fontWeight: 500 }}>{fmtCurrency(wo.total_charge || 0)}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={3} style={{ fontSize: 12, fontWeight: 500, color: "#1A1A1A", padding: "6px 6px", borderTop: "1px solid rgba(26,26,26,0.15)" }}>{sorted.length} work orders</td>
                  <td style={{ ...tdStyle, fontWeight: 500, borderTop: "1px solid rgba(26,26,26,0.15)" }}>{detailTotals.hd}</td>
                  <td style={{ ...tdStyle, borderTop: "1px solid rgba(26,26,26,0.15)" }}></td>
                  <td style={{ ...tdStyle, fontWeight: 500, borderTop: "1px solid rgba(26,26,26,0.15)" }}>{fmtCurrency(detailTotals.vetTax)}</td>
                  <td style={{ ...tdStyle, fontWeight: 500, borderTop: "1px solid rgba(26,26,26,0.15)" }}>{fmtCurrency(detailTotals.admin)}</td>
                  <td style={{ ...tdStyle, fontWeight: 500, borderTop: "1px solid rgba(26,26,26,0.15)" }}>{fmtCurrency(detailTotals.sol)}</td>
                  <td style={{ ...tdStyle, fontWeight: 500, fontSize: 12, borderTop: "1px solid rgba(26,26,26,0.15)" }}>{fmtCurrency(detailTotals.total)}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          {workOrders.length === 0 && (
            <div style={{ textAlign: "center", padding: "40px 0", color: "#717182", fontSize: 14 }}>No work orders for this sale day</div>
          )}
        </div>
      </div>
    </>
  );
};

export default DayBillingPage;
