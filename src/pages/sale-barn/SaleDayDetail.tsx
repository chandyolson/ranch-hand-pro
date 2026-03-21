import React, { useState, useMemo, useRef, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkOrders } from "@/hooks/sale-barn/useWorkOrders";
import { useChuteSideToast as useToast } from "@/components/ToastContext";
import type { SaleDay, WorkOrder, SaleBarnAnimal, SortRecord } from "@/types/sale-barn";

const fmtDate = (iso: string) => {
  const d = new Date(iso + "T12:00:00");
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
};

const fmtCurrency = (n: number) =>
  `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const TABS = ["Work Orders", "Reconciliation", "Reports"] as const;
const WO_FILTERS = ["All", "Sellers", "Buyers", "Incomplete"] as const;

const SaleDayDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const { data: saleDay, isLoading: sdLoading } = useQuery({
    queryKey: ["sale_day", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sale_days" as any)
        .select("*")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data as unknown as SaleDay;
    },
  });

  const { data: workOrdersResult } = useWorkOrders(id);
  const workOrders = workOrdersResult?.data ?? [];

  const [activeTab, setActiveTab] = useState<string>("Work Orders");
  const [woFilter, setWoFilter] = useState<string>("All");
  const [woSearch, setWoSearch] = useState("");

  // Billing calculations
  const billing = useMemo(() => {
    const s = { vet: 0, admin: 0, sol: 0, tax: 0, total: 0, head: 0 };
    const b = { vet: 0, admin: 0, sol: 0, tax: 0, total: 0, head: 0 };
    workOrders.forEach((wo) => {
      const t = wo.entity_type === "seller" ? s : b;
      t.vet += wo.vet_charge || 0;
      t.admin += wo.admin_charge || 0;
      t.sol += wo.sol_charge || 0;
      t.tax += wo.tax_charge || 0;
      t.total += wo.total_charge || 0;
      t.head += wo.head_count || 0;
    });
    return { seller: s, buyer: b };
  }, [workOrders]);

  const stats = useMemo(() => {
    const sellers = workOrders.filter((wo) => wo.entity_type === "seller").length;
    const buyers = workOrders.filter((wo) => wo.entity_type === "buyer").length;
    const totalHead = billing.seller.head + billing.buyer.head;
    const worked = workOrders.filter((wo) => wo.work_complete).reduce((sum, wo) => sum + (wo.head_count || 0), 0);
    const totalCharge = billing.seller.total + billing.buyer.total;
    return { orders: workOrders.length, sellers, buyers, totalHead, worked, totalCharge };
  }, [workOrders, billing]);

  // Filter work orders
  const filteredWOs = useMemo(() => {
    let list = workOrders;
    if (woFilter === "Sellers") list = list.filter((wo) => wo.entity_type === "seller");
    else if (woFilter === "Buyers") list = list.filter((wo) => wo.entity_type === "buyer");
    else if (woFilter === "Incomplete") list = list.filter((wo) => !wo.work_complete || !wo.health_complete);
    if (woSearch.trim()) {
      const q = woSearch.toLowerCase();
      list = list.filter((wo) =>
        (wo.buyer_num || "").toLowerCase().includes(q) ||
        (wo.work_type || "").toLowerCase().includes(q) ||
        (wo.group_notes || "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [workOrders, woFilter, woSearch]);

  const filterCounts = useMemo(() => ({
    All: workOrders.length,
    Sellers: workOrders.filter((wo) => wo.entity_type === "seller").length,
    Buyers: workOrders.filter((wo) => wo.entity_type === "buyer").length,
    Incomplete: workOrders.filter((wo) => !wo.work_complete || !wo.health_complete).length,
  }), [workOrders]);

  if (sdLoading) {
    return <div style={{ textAlign: "center", padding: "60px 0", color: "rgba(26,26,26,0.35)", fontSize: 14 }}>Loading...</div>;
  }

  return (
    <div className="px-4">
      {/* Stat Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8, marginBottom: 14 }}>
        {[
          { label: "ORDERS", value: stats.orders, subtitle: `${stats.sellers}S / ${stats.buyers}B`, angle: 130 },
          { label: "TOTAL HD", value: stats.totalHead, subtitle: `${stats.worked} worked`, angle: 140 },
          { label: "CATL", value: fmtCurrency(stats.totalCharge), subtitle: "Revenue", angle: 155 },
          { label: "RECON", value: "0/0", subtitle: "On track", angle: 170 },
        ].map((card) => (
          <div
            key={card.label}
            style={{
              background: `linear-gradient(${card.angle}deg, #0E2646 0%, #163A5E 55%, #55BAAA 100%)`,
              borderRadius: 12, padding: "8px 10px", minHeight: 68,
              display: "flex", flexDirection: "column",
            }}
          >
            <div style={{ fontSize: 9, fontWeight: 600, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
              {card.label}
            </div>
            <div style={{ flex: 1 }} />
            <div style={{ fontSize: 17, fontWeight: 600, color: "#FFFFFF", letterSpacing: "-0.02em", lineHeight: 1 }}>
              {card.value}
            </div>
            <div style={{ fontSize: 10, fontWeight: 500, color: "#A8E6DA", marginTop: 4 }}>
              {card.subtitle}
            </div>
          </div>
        ))}
      </div>

      {/* Tab Bar */}
      <div style={{ display: "flex", background: "#FFFFFF", borderBottom: "1px solid #D4D4D0", marginLeft: -16, marginRight: -16, paddingLeft: 16, paddingRight: 16 }}>
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              flex: 1, padding: "12px 8px", fontSize: 14, cursor: "pointer",
              fontWeight: activeTab === tab ? 700 : 500,
              color: activeTab === tab ? "#0E2646" : "#717182",
              borderBottom: activeTab === tab ? "2.5px solid #F3D12A" : "2.5px solid transparent",
              background: "none", border: "none", borderBottomStyle: "solid",
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === "Work Orders" && (
        <div style={{ marginTop: 14 }}>
          {/* Day Billing Card */}
          <div style={{
            background: "#FFFFFF", borderRadius: 12,
            border: "1px solid rgba(212,212,208,0.60)",
            padding: "12px 14px", marginBottom: 14,
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: "#0E2646" }}>Day Billing</span>
              <span style={{ fontSize: 16, fontWeight: 700, color: "#55BAAA" }}>
                {fmtCurrency(billing.seller.total + billing.buyer.total)}
              </span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "4px 10px", fontSize: 12 }}>
              {/* Header */}
              <span style={{ color: "rgba(26,26,26,0.40)", fontWeight: 600 }}></span>
              <span style={{ color: "rgba(26,26,26,0.40)", fontWeight: 600, textAlign: "right" }}>Seller</span>
              <span style={{ color: "rgba(26,26,26,0.40)", fontWeight: 600, textAlign: "right" }}>Buyer</span>
              <span style={{ color: "#55BAAA", fontWeight: 600, textAlign: "right" }}>Total</span>
              {/* Vet */}
              <span style={{ color: "#1A1A1A", fontWeight: 500 }}>Vet</span>
              <span style={{ color: "#1A1A1A", textAlign: "right" }}>{fmtCurrency(billing.seller.vet)}</span>
              <span style={{ color: "#1A1A1A", textAlign: "right" }}>{fmtCurrency(billing.buyer.vet)}</span>
              <span style={{ color: "#55BAAA", fontWeight: 600, textAlign: "right" }}>{fmtCurrency(billing.seller.vet + billing.buyer.vet)}</span>
              {/* Admin */}
              <span style={{ color: "#1A1A1A", fontWeight: 500 }}>Admin 5%</span>
              <span style={{ color: "#1A1A1A", textAlign: "right" }}>{fmtCurrency(billing.seller.admin)}</span>
              <span style={{ color: "#1A1A1A", textAlign: "right" }}>{fmtCurrency(billing.buyer.admin)}</span>
              <span style={{ color: "#55BAAA", fontWeight: 600, textAlign: "right" }}>{fmtCurrency(billing.seller.admin + billing.buyer.admin)}</span>
              {/* SOL */}
              <span style={{ color: "#1A1A1A", fontWeight: 500 }}>SOL</span>
              <span style={{ color: "#1A1A1A", textAlign: "right" }}>{fmtCurrency(billing.seller.sol)}</span>
              <span style={{ color: "#1A1A1A", textAlign: "right" }}>{fmtCurrency(billing.buyer.sol)}</span>
              <span style={{ color: "#55BAAA", fontWeight: 600, textAlign: "right" }}>{fmtCurrency(billing.seller.sol + billing.buyer.sol)}</span>
              {/* Divider */}
              <div style={{ gridColumn: "1 / -1", height: 1, background: "rgba(26,26,26,0.08)", margin: "4px 0" }} />
              {/* Total */}
              <span style={{ color: "#0E2646", fontWeight: 700 }}>Total</span>
              <span style={{ color: "#1A1A1A", fontWeight: 600, textAlign: "right" }}>{fmtCurrency(billing.seller.total)}</span>
              <span style={{ color: "#1A1A1A", fontWeight: 600, textAlign: "right" }}>{fmtCurrency(billing.buyer.total)}</span>
              <span style={{ color: "#55BAAA", fontWeight: 700, textAlign: "right" }}>{fmtCurrency(billing.seller.total + billing.buyer.total)}</span>
            </div>
          </div>

          {/* Vet Crew Bar */}
          {saleDay?.vet_crew && (
            <div style={{
              background: "#FFFFFF", borderRadius: 8,
              border: "1px solid rgba(212,212,208,0.40)",
              padding: "8px 12px", marginBottom: 14,
              display: "flex", alignItems: "center", gap: 6,
            }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: "#717182" }}>Crew:</span>
              <span style={{ fontSize: 13, fontWeight: 500, color: "#1A1A1A" }}>{saleDay.vet_crew}</span>
            </div>
          )}

          {/* Work Orders Sub-toolbar */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <span style={{ fontSize: 16, fontWeight: 700, color: "#0E2646" }}>Work Orders</span>
            <button
              className="active:scale-[0.95]"
              onClick={() => navigate(`/sale-barn/${id}/work-order/new`)}
              style={{
                width: 36, height: 36, borderRadius: "50%",
                background: "#F3D12A", border: "none",
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer", fontSize: 20, fontWeight: 700, color: "#1A1A1A", lineHeight: 1,
              }}
            >
              +
            </button>
          </div>

          {/* Search */}
          <div style={{ position: "relative", marginBottom: 10 }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ position: "absolute", left: 12, top: 12, pointerEvents: "none" }}>
              <circle cx="7" cy="7" r="5.5" stroke="rgba(26,26,26,0.3)" strokeWidth="1.5" />
              <path d="M11 11L14 14" stroke="rgba(26,26,26,0.3)" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <input
              value={woSearch}
              onChange={(e) => setWoSearch(e.target.value)}
              placeholder="Search work orders..."
              style={{
                width: "100%", height: 40, borderRadius: 12,
                border: "1px solid rgba(212,212,208,0.60)",
                background: "#FFFFFF", paddingLeft: 36, paddingRight: 36,
                fontSize: 14, fontWeight: 400, color: "#1A1A1A", outline: "none", boxSizing: "border-box",
              }}
            />
            {woSearch && (
              <button
                onClick={() => setWoSearch("")}
                style={{
                  position: "absolute", right: 10, top: 8,
                  width: 24, height: 24, borderRadius: "50%",
                  background: "rgba(26,26,26,0.06)", border: "none", cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 14, fontWeight: 600, color: "rgba(26,26,26,0.4)",
                }}
              >
                ×
              </button>
            )}
          </div>

          {/* Filter Pills */}
          <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
            {WO_FILTERS.map((f) => (
              <button
                key={f}
                className="active:scale-[0.97]"
                onClick={() => setWoFilter(f)}
                style={{
                  height: 30, borderRadius: 9999, padding: "0 12px",
                  fontSize: 12, fontWeight: 600, cursor: "pointer",
                  border: woFilter === f ? "none" : "1px solid #D4D4D0",
                  background: woFilter === f ? "#0E2646" : "#FFFFFF",
                  color: woFilter === f ? "#FFFFFF" : "rgba(26,26,26,0.50)",
                }}
              >
                {f} ({filterCounts[f as keyof typeof filterCounts]})
              </button>
            ))}
          </div>

          {/* Work Order Cards */}
          {filteredWOs.length === 0 ? (
            <div style={{ textAlign: "center", padding: "30px 0", color: "rgba(26,26,26,0.35)", fontSize: 14 }}>
              No work orders found
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {filteredWOs.map((wo) => {
                const workedHead = wo.work_complete ? wo.head_count : 0;
                const pens = (wo.pens || []).join(", ");
                return (
                  <button
                    key={wo.id}
                    className="active:scale-[0.98]"
                    onClick={() => navigate(`/sale-barn/${id}/work-order/${wo.id}`)}
                    style={{
                      background: "#0E2646", borderRadius: 12, padding: "12px 14px",
                      border: "none", cursor: "pointer", textAlign: "left", width: "100%",
                    }}
                  >
                    {/* Row 1 */}
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontSize: 15, fontWeight: 600, color: "#F0F0F0", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {wo.buyer_num ? `#${wo.buyer_num}` : "Customer"}
                      </span>
                      <span style={{
                        fontSize: 9, fontWeight: 700, letterSpacing: "0.06em", borderRadius: 9999,
                        padding: "3px 8px",
                        background: wo.entity_type === "seller" ? "rgba(243,209,42,0.12)" : "rgba(85,186,170,0.15)",
                        color: wo.entity_type === "seller" ? "#F3D12A" : "#55BAAA",
                      }}>
                        {wo.entity_type === "seller" ? "SELLER" : "BUYER"}
                      </span>
                      {wo.work_complete && (
                        <span style={{
                          fontSize: 9, fontWeight: 700, letterSpacing: "0.06em", borderRadius: 9999,
                          padding: "3px 8px", background: "rgba(243,209,42,0.12)", color: "#F3D12A",
                        }}>
                          DONE
                        </span>
                      )}
                    </div>

                    {/* Row 2 */}
                    <div style={{ fontSize: 13, fontWeight: 400, color: "rgba(240,240,240,0.65)", marginTop: 4 }}>
                      {[wo.work_type, wo.animal_type, wo.entity_type === "buyer" && wo.buyer_num ? `#${wo.buyer_num}` : null]
                        .filter(Boolean)
                        .join(" · ")}
                    </div>

                    {/* Row 3 */}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 8 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        {pens && (
                          <span style={{ fontSize: 12, fontWeight: 400, color: "rgba(240,240,240,0.45)" }}>
                            Pen {pens}
                          </span>
                        )}
                        {/* Progress */}
                        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                          <div style={{ width: 80, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.08)", overflow: "hidden" }}>
                            <div style={{
                              width: wo.head_count ? `${(workedHead / wo.head_count) * 100}%` : "0%",
                              height: "100%", background: "#55BAAA", borderRadius: 2,
                            }} />
                          </div>
                          <span style={{ fontSize: 11, fontWeight: 500, color: "rgba(168,230,218,0.70)" }}>
                            {workedHead}/{wo.head_count || 0}
                          </span>
                        </div>
                      </div>
                      <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
                        <span style={{ fontSize: 10, fontWeight: 600, color: "rgba(255,255,255,0.35)", textTransform: "uppercase" }}>TOTAL</span>
                        <span style={{ fontSize: 14, fontWeight: 600, color: "#55BAAA" }}>{fmtCurrency(wo.total_charge || 0)}</span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {activeTab === "Reconciliation" && (
        <div style={{ textAlign: "center", padding: "40px 0", color: "rgba(26,26,26,0.35)", fontSize: 14 }}>
          Reconciliation coming soon
        </div>
      )}

      {activeTab === "Reports" && (
        <div style={{ textAlign: "center", padding: "40px 0", color: "rgba(26,26,26,0.35)", fontSize: 14 }}>
          Reports coming soon
        </div>
      )}
    </div>
  );
};

export default SaleDayDetail;
