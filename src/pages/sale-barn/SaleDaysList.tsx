import React, { useState, useMemo, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useOperation } from "@/contexts/OperationContext";
import { useChuteSideToast as useToast } from "@/components/ToastContext";
import { useSaleDays } from "@/hooks/sale-barn/useSaleDays";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import FieldRow from "@/components/calving/FieldRow";
import type { SaleDay, WorkOrder, Consignment } from "@/types/sale-barn";

const STATUS_OPTIONS = ["All", "Active", "Completed", "Scheduled"] as const;

const fmtDate = (iso: string) => {
  const d = new Date(iso + "T12:00:00");
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
};

const fmtCurrency = (n: number) =>
  n >= 1000 ? `$${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}k` : `$${n.toFixed(0)}`;

const fmtCurrencyFull = (n: number) =>
  `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const INPUT_STYLE: React.CSSProperties = {
  height: 36, borderRadius: 8, border: "1px solid #D4D4D0",
  fontSize: 16, fontFamily: "Inter, sans-serif", padding: "0 12px",
  outline: "none", width: "100%", boxSizing: "border-box",
};

const FOCUS_STYLE: React.CSSProperties = { borderColor: "#F3D12A", boxShadow: "0 0 0 2px rgba(243,209,42,0.25)" };

const SaleDaysList: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { operationId } = useOperation();
  const { showToast } = useToast();
  const { data: saleDaysResult, isLoading } = useSaleDays();
  const saleDays = saleDaysResult?.data ?? [];

  // New Sale Day form state
  const [formOpen, setFormOpen] = useState(false);
  const [formDate, setFormDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [formCrew, setFormCrew] = useState("");
  const [formStatus, setFormStatus] = useState("active");
  const [formSaving, setFormSaving] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!formDate) { showToast("error", "Date is required"); return; }
    setFormSaving(true);
    try {
      const { data, error } = await (supabase.from("sale_days" as any).insert({
        operation_id: operationId,
        date: formDate,
        vet_crew: formCrew || null,
        status: formStatus,
      } as any).select().single() as any);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["sale_days"] });
      showToast("success", "Sale day created");
      setFormOpen(false);
      setFormCrew("");
      setFormStatus("active");
      navigate(`/sale-barn/${(data as any).id}`);
    } catch (e: any) {
      showToast("error", e.message || "Failed to create sale day");
    } finally {
      setFormSaving(false);
    }
  };

  // Fetch all work orders for all sale days in one query
  const saleDayIds = useMemo(() => saleDays.map((sd) => sd.id), [saleDays]);
  const { data: allWorkOrders } = useQuery({
    queryKey: ["work_orders_for_sale_days", saleDayIds],
    enabled: saleDayIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("work_orders" as any)
        .select("*")
        .in("sale_day_id", saleDayIds);
      if (error) throw error;
      return (data ?? []) as unknown as WorkOrder[];
    },
  });

  // Group work orders by sale_day_id
  const woMap = useMemo(() => {
    const m: Record<string, WorkOrder[]> = {};
    (allWorkOrders ?? []).forEach((wo) => {
      if (!m[wo.sale_day_id]) m[wo.sale_day_id] = [];
      m[wo.sale_day_id].push(wo);
    });
    return m;
  }, [allWorkOrders]);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setDropdownOpen(false);
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = useMemo(() => {
    let list = saleDays;
    if (statusFilter !== "All") {
      list = list.filter((sd) => sd.status === statusFilter.toLowerCase());
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((sd) => sd.date.toLowerCase().includes(q) || fmtDate(sd.date).toLowerCase().includes(q));
    }
    return list;
  }, [saleDays, statusFilter, search]);

  // Aggregate stats
  const stats = useMemo(() => {
    let totalHead = 0;
    let totalCATL = 0;
    (allWorkOrders ?? []).forEach((wo) => {
      totalHead += wo.head_count || 0;
      totalCATL += wo.total_charge || 0;
    });
    return { saleDayCount: saleDays.length, totalHead, totalCATL };
  }, [saleDays, allWorkOrders]);

  const getWoStats = (sdId: string) => {
    const wos = woMap[sdId] || [];
    let sellerLots = 0, sellerHead = 0, buyerLots = 0, buyerHead = 0;
    let cattlTotal = 0, solTotal = 0;
    let totalWos = wos.length;
    let completedWos = 0;
    wos.forEach((wo) => {
      if (wo.entity_type === "seller") { sellerLots++; sellerHead += wo.head_count || 0; }
      else { buyerLots++; buyerHead += wo.head_count || 0; }
      cattlTotal += wo.total_charge || 0;
      solTotal += wo.sol_charge || 0;
      if (wo.work_complete && wo.health_complete) completedWos++;
    });
    return { sellerLots, sellerHead, buyerLots, buyerHead, cattlTotal, solTotal, totalHead: sellerHead + buyerHead, totalWos, completedWos };
  };

  return (
    <div className="px-4">
      {/* Stat Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 16 }}>
        {[
          { label: "SALE DAYS", value: stats.saleDayCount, subtitle: "This Season", angle: 130 },
          { label: "TOTAL HEAD", value: stats.totalHead, subtitle: "Processed", angle: 150 },
          { label: "CATL TOTAL", value: fmtCurrency(stats.totalCATL), subtitle: "Revenue", angle: 170 },
        ].map((card) => (
          <div
            key={card.label}
            style={{
              background: `linear-gradient(${card.angle}deg, #0E2646 0%, #163A5E 55%, #55BAAA 100%)`,
              borderRadius: 12,
              padding: "10px 12px",
              minHeight: 72,
            }}
          >
            <div style={{ fontSize: 10, fontWeight: 600, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
              {card.label}
            </div>
            <div style={{ fontSize: 20, fontWeight: 600, color: "#FFFFFF", letterSpacing: "-0.02em", marginTop: 2 }}>
              {card.value}
            </div>
            <div style={{ fontSize: 11, fontWeight: 500, color: "#A8E6DA", marginTop: 1 }}>
              {card.subtitle}
            </div>
          </div>
        ))}
      </div>

      {/* Toolbar Row 1: Title + actions */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <div style={{ fontSize: 20, fontWeight: 800, color: "#0E2646", letterSpacing: "-0.02em" }}>Sale Days</div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {/* 3-dot menu */}
          <div ref={menuRef} style={{ position: "relative" }}>
            <button
              className="active:scale-[0.95]"
              onClick={() => setMenuOpen(!menuOpen)}
              style={{
                width: 36, height: 36, borderRadius: "50%",
                background: "#FFFFFF", border: "1px solid #D4D4D0",
                display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
              }}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="3" r="1.5" fill="#0E2646" />
                <circle cx="8" cy="8" r="1.5" fill="#0E2646" />
                <circle cx="8" cy="13" r="1.5" fill="#0E2646" />
              </svg>
            </button>
            {menuOpen && (
              <div style={{
                position: "absolute", right: 0, top: 40, background: "#FFFFFF",
                borderRadius: 12, boxShadow: "0 4px 20px rgba(0,0,0,0.12)",
                minWidth: 160, padding: "6px 0", zIndex: 20,
              }}>
                {["Export", "Settings"].map((item) => (
                  <button
                    key={item}
                    style={{ display: "block", width: "100%", textAlign: "left", padding: "10px 16px", fontSize: 14, fontWeight: 500, color: "#1A1A1A", border: "none", background: "none", cursor: "pointer" }}
                    onClick={() => { setMenuOpen(false); showToast("info", `${item} coming soon`); }}
                  >
                    {item}
                  </button>
                ))}
              </div>
            )}
          </div>
          {/* Gold + button */}
          <button
            className="active:scale-[0.95]"
            onClick={() => setFormOpen(!formOpen)}
            style={{
              width: 36, height: 36, borderRadius: "50%",
              background: "#F3D12A", border: "none",
              display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
              fontSize: 20, fontWeight: 700, color: "#1A1A1A", lineHeight: 1,
            }}
          >
            {formOpen ? "×" : "+"}
          </button>
        </div>
      </div>

      {/* New Sale Day Inline Form */}
      {formOpen && (
        <div style={{
          background: "#FFFFFF", borderRadius: 12, border: "1px solid #F3D12A",
          boxShadow: "0 0 0 2px rgba(243,209,42,0.15)", padding: "12px 14px", marginBottom: 12,
        }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#0E2646", marginBottom: 10 }}>New Sale Day</div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <FieldRow label="Date" req>
              <input
                type="date"
                value={formDate}
                onChange={(e) => setFormDate(e.target.value)}
                onFocus={() => setFocusedField("date")}
                onBlur={() => setFocusedField(null)}
                style={{ ...INPUT_STYLE, ...(focusedField === "date" ? FOCUS_STYLE : {}) }}
              />
            </FieldRow>

            <FieldRow label="Vet Crew">
              <input
                value={formCrew}
                onChange={(e) => setFormCrew(e.target.value)}
                placeholder="e.g. Dr. Collins, Jake, Maria"
                onFocus={() => setFocusedField("crew")}
                onBlur={() => setFocusedField(null)}
                style={{ ...INPUT_STYLE, ...(focusedField === "crew" ? FOCUS_STYLE : {}) }}
              />
            </FieldRow>

            <FieldRow label="Status">
              <div style={{
                display: "flex", gap: 0, flex: 1, border: "1px solid #D4D4D0",
                borderRadius: 8, overflow: "hidden", height: 36,
              }}>
                {[
                  { value: "scheduled", label: "Scheduled" },
                  { value: "active", label: "Active" },
                  { value: "completed", label: "Completed" },
                ].map((opt, i) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setFormStatus(opt.value)}
                    style={{
                      flex: 1, minWidth: 0, padding: 0, fontSize: 13, fontWeight: 600,
                      border: "none", borderRight: i < 2 ? "1px solid #D4D4D0" : "none",
                      borderRadius: 0, cursor: "pointer",
                      backgroundColor: formStatus === opt.value ? "#0E2646" : "transparent",
                      color: formStatus === opt.value ? "#FFFFFF" : "#717182",
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </FieldRow>
          </div>

          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
            <button
              onClick={() => setFormOpen(false)}
              style={{
                flex: 1, height: 38, borderRadius: 9999, border: "1px solid #D4D4D0",
                background: "transparent", fontSize: 13, fontWeight: 600, color: "#717182", cursor: "pointer",
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={formSaving}
              className="active:scale-[0.97]"
              style={{
                flex: 1, height: 38, borderRadius: 9999, border: "none",
                background: "#F3D12A", fontSize: 13, fontWeight: 700, color: "#1A1A1A",
                boxShadow: "0 2px 8px rgba(243,209,42,0.30)", cursor: "pointer",
                opacity: formSaving ? 0.6 : 1,
              }}
            >
              {formSaving ? "Creating..." : "Create Sale Day"}
            </button>
          </div>
        </div>
      )}

      {/* Toolbar Row 2: Search */}
      <div style={{ position: "relative", marginBottom: 10 }}>
        <svg
          width="16" height="16" viewBox="0 0 16 16" fill="none"
          style={{ position: "absolute", left: 14, top: 14, pointerEvents: "none" }}
        >
          <circle cx="7" cy="7" r="5.5" stroke="rgba(26,26,26,0.3)" strokeWidth="1.5" />
          <path d="M11 11L14 14" stroke="rgba(26,26,26,0.3)" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search sale days..."
          style={{
            width: "100%", height: 44, borderRadius: 12,
            border: "1px solid rgba(212,212,208,0.60)",
            background: "#FFFFFF", paddingLeft: 40, paddingRight: 36,
            fontSize: 14, fontWeight: 400, color: "#1A1A1A", outline: "none",
            boxSizing: "border-box",
          }}
        />
        {search && (
          <button
            onClick={() => setSearch("")}
            style={{
              position: "absolute", right: 10, top: 10,
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

      {/* Toolbar Row 3: Status filter pill + count */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <div ref={dropdownRef} style={{ position: "relative" }}>
          <button
            className="active:scale-[0.97]"
            onClick={() => setDropdownOpen(!dropdownOpen)}
            style={{
              height: 30, borderRadius: 9999, padding: "0 14px",
              fontSize: 12, fontWeight: 600, cursor: "pointer",
              border: statusFilter === "All" ? "1px solid #D4D4D0" : "none",
              background: statusFilter === "All" ? "#FFFFFF" : "#0E2646",
              color: statusFilter === "All" ? "rgba(26,26,26,0.50)" : "#FFFFFF",
              display: "flex", alignItems: "center", gap: 4,
            }}
          >
            {statusFilter === "All" ? "Status" : statusFilter}
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <path d="M2.5 4L5 6.5L7.5 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
          {dropdownOpen && (
            <div style={{
              position: "absolute", left: 0, top: 34, background: "#FFFFFF",
              borderRadius: 12, boxShadow: "0 4px 20px rgba(0,0,0,0.12)",
              minWidth: 160, padding: "6px 0", zIndex: 20,
            }}>
              {STATUS_OPTIONS.map((opt) => (
                <button
                  key={opt}
                  style={{
                    display: "block", width: "100%", textAlign: "left",
                    padding: "10px 16px", fontSize: 13, fontWeight: statusFilter === opt ? 700 : 400,
                    color: statusFilter === opt ? "#0E2646" : "#1A1A1A",
                    border: "none", background: "none", cursor: "pointer",
                  }}
                  onClick={() => { setStatusFilter(opt); setDropdownOpen(false); }}
                >
                  {opt}
                </button>
              ))}
            </div>
          )}
        </div>
        <div style={{ fontSize: 12, fontWeight: 600, color: "rgba(26,26,26,0.40)" }}>
          {filtered.length} result{filtered.length !== 1 ? "s" : ""}
        </div>
      </div>

      {/* Sale Day Cards */}
      {isLoading ? (
        <div style={{ textAlign: "center", padding: "40px 0", color: "rgba(26,26,26,0.35)", fontSize: 14 }}>Loading...</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "40px 0", color: "rgba(26,26,26,0.35)", fontSize: 14 }}>
          {saleDays.length === 0 ? "No sale days yet" : "No matching sale days"}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {filtered.map((sd) => {
            const ws = getWoStats(sd.id);
            const statusUpper = sd.status.toUpperCase();
            const badgeStyle: React.CSSProperties =
              sd.status === "active"
                ? { background: "rgba(85,186,170,0.15)", color: "#55BAAA" }
                : sd.status === "completed"
                ? { background: "rgba(243,209,42,0.12)", color: "#F3D12A" }
                : { background: "rgba(240,240,240,0.10)", color: "rgba(240,240,240,0.50)" };

            return (
              <button
                key={sd.id}
                className="active:scale-[0.98]"
                onClick={() => navigate(`/sale-barn/${sd.id}`)}
                style={{
                  background: "#0E2646", borderRadius: 12, padding: "14px 16px",
                  border: "none", cursor: "pointer", textAlign: "left", width: "100%",
                }}
              >
                {/* Row 1 */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 16, fontWeight: 600, color: "#F0F0F0" }}>{fmtDate(sd.date)}</span>
                  <span style={{
                    fontSize: 9, fontWeight: 700, letterSpacing: "0.06em", borderRadius: 9999,
                    padding: "3px 8px", ...badgeStyle,
                  }}>
                    {statusUpper}
                  </span>
                </div>

                {/* Row 2 */}
                <div style={{ fontSize: 13, fontWeight: 400, color: "rgba(240,240,240,0.65)", marginTop: 4 }}>
                  {ws.sellerLots} seller lot{ws.sellerLots !== 1 ? "s" : ""} · {ws.sellerHead} hd
                  <span style={{ margin: "0 6px", color: "rgba(240,240,240,0.25)" }}>|</span>
                  {ws.buyerLots} buyer lot{ws.buyerLots !== 1 ? "s" : ""} · {ws.buyerHead} hd
                </div>

                {/* Row 3 */}
                <div style={{ display: "flex", alignItems: "baseline", gap: 16, marginTop: 8 }}>
                  <div>
                    <span style={{ fontSize: 10, fontWeight: 600, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "0.04em" }}>CATL </span>
                    <span style={{ fontSize: 15, fontWeight: 600, color: "#55BAAA" }}>{fmtCurrencyFull(ws.cattlTotal)}</span>
                  </div>
                  <div>
                    <span style={{ fontSize: 10, fontWeight: 600, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "0.04em" }}>SOL </span>
                    <span style={{ fontSize: 15, fontWeight: 600, color: "rgba(240,240,240,0.65)" }}>{fmtCurrencyFull(ws.solTotal)}</span>
                  </div>
                  <div style={{ marginLeft: "auto" }}>
                    <span style={{ fontSize: 18, fontWeight: 700, color: "#FFFFFF" }}>{ws.totalHead}</span>
                    <span style={{ fontSize: 10, fontWeight: 500, color: "rgba(255,255,255,0.35)", marginLeft: 3 }}>hd</span>
                  </div>
                </div>

                {/* Row 4 */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 6 }}>
                  <span style={{ fontSize: 12, fontWeight: 400, color: "rgba(240,240,240,0.45)" }}>
                    {ws.totalWos} work order{ws.totalWos !== 1 ? "s" : ""}
                  </span>
                  {sd.status === "active" && ws.totalWos > 0 && (
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <div style={{ width: 60, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.08)", overflow: "hidden" }}>
                        <div style={{ width: `${(ws.completedWos / ws.totalWos) * 100}%`, height: "100%", background: "#55BAAA", borderRadius: 2 }} />
                      </div>
                      <span style={{ fontSize: 10, fontWeight: 500, color: "rgba(240,240,240,0.45)" }}>
                        {ws.completedWos}/{ws.totalWos}
                      </span>
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default SaleDaysList;
