import React, { useState, useMemo, useRef, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOperation } from "@/contexts/OperationContext";
import { useWorkOrders } from "@/hooks/sale-barn/useWorkOrders";
import { useConsignments } from "@/hooks/sale-barn/useConsignments";
import { useChuteSideToast as useToast } from "@/components/ToastContext";
import FieldRow from "@/components/calving/FieldRow";
import type { SaleDay, WorkOrder, SaleBarnAnimal, SortRecord, Consignment, SaleBarnCustomer, WorkOrderNote } from "@/types/sale-barn";

const fmtDate = (iso: string) => {
  const d = new Date(iso + "T12:00:00");
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
};

const fmtCurrency = (n: number) =>
  `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const TABS = ["Work Orders", "Reconciliation"] as const;
const WO_FILTERS = ["all", "sellers", "buyers", "needs_work", "needs_health"] as const;
const WO_FILTER_LABELS: Record<string, string> = {
  all: "All", sellers: "Sellers", buyers: "Buyers",
  needs_work: "Needs Work", needs_health: "Needs Health",
};

const ANIMAL_TYPES = ["Bred Heifers", "Feeder Calves", "Pairs", "Bull", "Bred Cows", "Weigh Up Cows", "Baby Calf", "Heifers", "Yearling Bull"];

const CONSIGN_INPUT: React.CSSProperties = {
  height: 36, borderRadius: 8, border: "1px solid #D4D4D0",
  fontSize: 16, fontFamily: "Inter, sans-serif", padding: "0 12px",
  outline: "none", width: "100%", boxSizing: "border-box",
};

const CONSIGN_BADGE: Record<string, { bg: string; text: string }> = {
  pending: { bg: "rgba(243,209,42,0.12)", text: "#B8860B" },
  arrived: { bg: "rgba(85,186,170,0.15)", text: "#55BAAA" },
  converted: { bg: "rgba(14,38,70,0.10)", text: "#0E2646" },
  cancelled: { bg: "rgba(26,26,26,0.06)", text: "#717182" },
};

// ── Customer Typeahead for Consignment ──
const ConsignCustomerSearch: React.FC<{
  operationId: string;
  value: string;
  customerId: string | null;
  onChange: (name: string, id: string | null) => void;
}> = ({ operationId, value, customerId, onChange }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const { data: suggestions } = useQuery({
    queryKey: ["consign_cust_search", operationId, value],
    enabled: value.length >= 2 && !customerId,
    queryFn: async () => {
      const { data } = await (supabase.from("sale_barn_customers") as any)
        .select("*").eq("operation_id", operationId)
        .ilike("name", `%${value}%`).limit(20);
      return (data ?? []) as unknown as SaleBarnCustomer[];
    },
  });

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} style={{ flex: 1, minWidth: 0, position: "relative" }}>
      <div style={{ display: "flex", alignItems: "center", position: "relative" }}>
        <input
          style={{
            ...CONSIGN_INPUT,
            background: customerId ? "rgba(85,186,170,0.06)" : "#FFFFFF",
          }}
          placeholder="Search customer…"
          value={value}
          onChange={(e) => { onChange(e.target.value, null); setOpen(true); }}
          onFocus={() => { if (value.length >= 2 && !customerId) setOpen(true); }}
        />
        {customerId && (
          <button
            onClick={() => { onChange("", null); }}
            style={{
              position: "absolute", right: 8, background: "none", border: "none",
              cursor: "pointer", fontSize: 16, color: "#717182", lineHeight: 1,
            }}
          >×</button>
        )}
      </div>
      {open && suggestions && suggestions.length > 0 && (
        <div style={{
          position: "absolute", top: 40, left: 0, right: 0, zIndex: 50,
          background: "#FFFFFF", borderRadius: 10, border: "1px solid #D4D4D0",
          boxShadow: "0 4px 16px rgba(0,0,0,0.10)", maxHeight: 200, overflowY: "auto",
        }}>
          {suggestions.map((c) => (
            <button
              key={c.id}
              onClick={() => { onChange(c.name, c.id); setOpen(false); }}
              style={{
                display: "block", width: "100%", textAlign: "left", padding: "8px 12px",
                border: "none", background: "none", cursor: "pointer",
              }}
            >
              <div style={{ fontSize: 14, fontWeight: 600, color: "#1A1A1A" }}>{c.name}</div>
              {c.address && <div style={{ fontSize: 12, color: "#717182" }}>{c.address}</div>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// ── Consignments Tab ──
const ConsignmentsTab: React.FC<{
  consignments: Consignment[];
  saleDayId: string;
  saleDayDate: string;
  operationId: string;
  activeTab: string;
  showToast: (v: string, m: string) => void;
  navigate: (to: string) => void;
}> = ({ consignments, saleDayId, saleDayDate, operationId, activeTab, showToast, navigate }) => {
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [custName, setCustName] = useState("");
  const [custId, setCustId] = useState<string | null>(null);
  const [expectedDate, setExpectedDate] = useState(saleDayDate || "");
  const [headCount, setHeadCount] = useState("");
  const [animalType, setAnimalType] = useState("");
  const [takenBy, setTakenBy] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  if (activeTab !== "Consignments") return null;

  const totalHead = consignments.reduce((s, c) => s + (c.head_count || 0), 0);
  const pendingCount = consignments.filter((c) => c.status === "pending").length;
  const arrivedCount = consignments.filter((c) => c.status === "arrived").length;

  const resetForm = () => {
    setCustName(""); setCustId(null); setExpectedDate(saleDayDate || ""); setHeadCount(""); setAnimalType("");
    setTakenBy(""); setNotes(""); setEditId(null);
  };

  const openEdit = (c: Consignment) => {
    setCustName(c.customer_name); setCustId(c.customer_id); setExpectedDate(c.expected_sale_date || ""); setHeadCount(String(c.head_count));
    setAnimalType(c.animal_type || ""); setTakenBy(c.taken_by || ""); setNotes(c.notes || "");
    setEditId(c.id); setFormOpen(true);
  };

  const handleSave = async () => {
    if (!custName.trim()) { showToast("error", "Customer name is required"); return; }
    const hc = parseInt(headCount) || 0;
    if (hc < 1) { showToast("error", "Enter head count"); return; }
    setSaving(true);
    const row: Record<string, any> = {
      operation_id: operationId,
      sale_day_id: saleDayId,
      customer_id: custId,
      customer_name: custName.trim(),
      head_count: hc,
      animal_type: animalType || null,
      taken_by: takenBy || null,
      notes: notes || null,
      expected_sale_date: expectedDate || null,
      status: "pending",
    };
    let error: any;
    if (editId) {
      ({ error } = await (supabase.from("consignments") as any).update(row).eq("id", editId));
    } else {
      ({ error } = await (supabase.from("consignments") as any).insert(row));
    }
    setSaving(false);
    if (error) { showToast("error", error.message); return; }
    queryClient.invalidateQueries({ queryKey: ["consignments"] });
    showToast("success", editId ? "Consignment updated" : "Consignment saved");
    setFormOpen(false); resetForm();
  };

  const fmtTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" }) + " " +
      d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  };

  return (
    <div style={{ marginTop: 14 }}>
      {/* Stats row */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
        {[
          { label: `${consignments.length} total`, bg: "rgba(14,38,70,0.06)", text: "#0E2646" },
          { label: `${totalHead} hd`, bg: "rgba(14,38,70,0.06)", text: "#0E2646" },
          { label: `${pendingCount} pending`, bg: "rgba(243,209,42,0.12)", text: "#B8860B" },
          { label: `${arrivedCount} arrived`, bg: "rgba(85,186,170,0.15)", text: "#55BAAA" },
        ].map((p) => (
          <span key={p.label} style={{
            fontSize: 12, fontWeight: 600, padding: "4px 12px", borderRadius: 9999,
            background: p.bg, color: p.text,
          }}>{p.label}</span>
        ))}
      </div>

      {/* Title + Add */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <span style={{ fontSize: 16, fontWeight: 700, color: "#0E2646" }}>Consignments</span>
        <button
          className="active:scale-[0.95]"
          onClick={() => { if (formOpen && !editId) { setFormOpen(false); } else { resetForm(); setFormOpen(true); } }}
          style={{
            width: 36, height: 36, borderRadius: "50%",
            background: "#F3D12A", border: "none",
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", fontSize: 20, fontWeight: 700, color: "#1A1A1A", lineHeight: 1,
          }}
        >
          {formOpen && !editId ? "×" : "+"}
        </button>
      </div>

      {/* Inline Form */}
      {formOpen && (
        <div style={{
          background: "#FFFFFF", borderRadius: 12, border: "1px solid #F3D12A",
          boxShadow: "0 0 0 2px rgba(243,209,42,0.15)", padding: "12px 14px", marginBottom: 12,
        }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#0E2646", marginBottom: 10 }}>
            {editId ? "Edit Consignment" : "New Consignment"}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <FieldRow label="Customer" req>
              <ConsignCustomerSearch
                operationId={operationId}
                value={custName}
                customerId={custId}
                onChange={(name, id) => { setCustName(name); setCustId(id); }}
              />
            </FieldRow>
            <FieldRow label="Sale Date">
              <input
                type="date"
                value={expectedDate}
                onChange={(e) => setExpectedDate(e.target.value)}
                style={CONSIGN_INPUT}
                onFocus={(e) => { e.currentTarget.style.borderColor = "#F3D12A"; e.currentTarget.style.boxShadow = "0 0 0 2px rgba(243,209,42,0.25)"; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = "#D4D4D0"; e.currentTarget.style.boxShadow = "none"; }}
              />
            </FieldRow>
            <FieldRow label="Head Ct" req>
              <input
                type="number" min="1" value={headCount}
                onChange={(e) => setHeadCount(e.target.value)}
                style={CONSIGN_INPUT}
              />
            </FieldRow>
            <FieldRow label="Animal Type">
              <select
                value={animalType}
                onChange={(e) => setAnimalType(e.target.value)}
                style={CONSIGN_INPUT}
              >
                <option value="">Select type</option>
                {ANIMAL_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </FieldRow>
            <FieldRow label="Taken By">
              <input
                value={takenBy}
                onChange={(e) => setTakenBy(e.target.value)}
                placeholder="Who took the call"
                style={CONSIGN_INPUT}
              />
            </FieldRow>
            <FieldRow label="Notes">
              <input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any details from the caller"
                style={CONSIGN_INPUT}
              />
            </FieldRow>
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
            <button
              onClick={() => { setFormOpen(false); resetForm(); }}
              style={{
                flex: 1, height: 38, borderRadius: 9999, border: "1px solid #D4D4D0",
                background: "transparent", fontSize: 13, fontWeight: 600, color: "#717182", cursor: "pointer",
              }}
            >Cancel</button>
            <button
              onClick={handleSave} disabled={saving}
              className="active:scale-[0.97]"
              style={{
                flex: 1, height: 38, borderRadius: 9999, border: "none",
                background: "#F3D12A", fontSize: 13, fontWeight: 700, color: "#1A1A1A",
                boxShadow: "0 2px 8px rgba(243,209,42,0.30)", cursor: "pointer",
                opacity: saving ? 0.6 : 1,
              }}
            >{saving ? "Saving..." : editId ? "Update Consignment" : "Save Consignment"}</button>
          </div>
        </div>
      )}

      {/* Consignment Cards */}
      {consignments.length === 0 ? (
        <div style={{ textAlign: "center", padding: "30px 0", color: "rgba(26,26,26,0.35)", fontSize: 14 }}>
          No consignments yet
        </div>
      ) : (
        consignments.map((c) => {
          const badge = CONSIGN_BADGE[c.status] || CONSIGN_BADGE.pending;
          return (
            <div
              key={c.id}
              onClick={() => openEdit(c)}
              style={{
                background: "#FFFFFF", borderRadius: 10,
                border: "1px solid rgba(212,212,208,0.60)",
                padding: "12px 14px", marginBottom: 8, cursor: "pointer",
              }}
            >
              {/* Row 1 */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: 15, fontWeight: 600, color: "#1A1A1A" }}>{c.customer_name}</span>
                <span style={{
                  fontSize: 9, fontWeight: 700, letterSpacing: "0.06em", borderRadius: 9999,
                  padding: "3px 8px", background: badge.bg, color: badge.text, textTransform: "uppercase",
                }}>{c.status}</span>
              </div>
              {/* Row 2 */}
              <div style={{ fontSize: 13, fontWeight: 400, color: "#717182", marginTop: 4 }}>
                {c.expected_sale_date
                  ? new Date(c.expected_sale_date + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                  : <span style={{ fontStyle: "italic" }}>No date set</span>
                }
                {" · "}{c.head_count} hd{c.animal_type ? ` · ${c.animal_type}` : ""}
              </div>
              {/* Row 3 */}
              <div style={{ fontSize: 12, fontWeight: 400, color: "rgba(26,26,26,0.40)", marginTop: 2 }}>
                {c.taken_by ? `Taken by ${c.taken_by} · ` : ""}{fmtTime(c.created_at)}
              </div>
              {/* Notes */}
              {c.notes && (
                <div style={{
                  fontSize: 12, fontWeight: 400, color: "#717182", marginTop: 4,
                  padding: "6px 10px", background: "#F5F5F0", borderRadius: 8,
                }}>{c.notes}</div>
              )}
              {/* Create WO action */}
              {c.status === "arrived" && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/sale-barn/${saleDayId}/work-order/new?customer=${encodeURIComponent(c.customer_name)}&headCount=${c.head_count}&animalType=${encodeURIComponent(c.animal_type || "")}&consignmentId=${c.id}`);
                  }}
                  style={{
                    marginTop: 8, background: "none", border: "none", cursor: "pointer",
                    fontSize: 12, fontWeight: 700, color: "#55BAAA", padding: 0,
                  }}
                >Create Work Order →</button>
              )}
            </div>
          );
        })
      )}
    </div>
  );
};

// ── RECONCILIATION TAB ──
interface PenRow {
  pen: string;
  customerName: string;
  expected: number;
  actual: number;
  status: "matched" | "short" | "pending" | "sort";
  woId: string;
}

const statusColors: Record<string, { bg: string; border: string; text: string }> = {
  matched: { bg: "rgba(85,186,170,0.10)", border: "rgba(85,186,170,0.30)", text: "#55BAAA" },
  short: { bg: "rgba(243,209,42,0.10)", border: "rgba(243,209,42,0.30)", text: "#B8860B" },
  pending: { bg: "rgba(26,26,26,0.04)", border: "#D4D4D0", text: "#717182" },
  sort: { bg: "rgba(168,168,240,0.10)", border: "rgba(168,168,240,0.30)", text: "#7B68EE" },
};

const ReconciliationTab: React.FC<{ workOrders: WorkOrder[]; saleDayId: string; activeTab: string; customerMap?: Record<string, string> }> = ({ workOrders, saleDayId, activeTab, customerMap }) => {
  const woIds = useMemo(() => workOrders.map((wo) => wo.id), [workOrders]);

  const { data: animals } = useQuery({
    queryKey: ["recon_animals", woIds],
    enabled: activeTab === "Reconciliation" && woIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase.from("sale_barn_animals" as any).select("*").in("work_order_id", woIds);
      return (data ?? []) as unknown as SaleBarnAnimal[];
    },
  });

  const { data: sortRecords } = useQuery({
    queryKey: ["recon_sorts", woIds],
    enabled: activeTab === "Reconciliation" && woIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase.from("sort_records" as any).select("*").in("work_order_id", woIds);
      return (data ?? []) as unknown as SortRecord[];
    },
  });

  const penRows = useMemo(() => {
    const rows: PenRow[] = [];
    const animalsByWo: Record<string, SaleBarnAnimal[]> = {};
    (animals || []).forEach((a) => {
      if (!animalsByWo[a.work_order_id]) animalsByWo[a.work_order_id] = [];
      animalsByWo[a.work_order_id].push(a);
    });

    const sortPens = new Set<string>();
    (sortRecords || []).forEach((sr) => { sortPens.add(sr.dest_pen); });

    workOrders.forEach((wo) => {
      const pens = wo.pens || [];
      const woAnimals = animalsByWo[wo.id] || [];
      const headPerPen = pens.length > 0 ? Math.ceil((wo.head_count || 0) / pens.length) : wo.head_count || 0;

      if (pens.length === 0) {
        const actual = woAnimals.length;
        const expected = wo.head_count || 0;
        rows.push({
          pen: "—",
          customerName: (wo.customer_id && customerMap?.[wo.customer_id]) || (wo.buyer_num ? `#${wo.buyer_num}` : "No Customer"),
          expected,
          actual,
          status: !wo.work_complete ? "pending" : actual >= expected ? "matched" : "short",
          woId: wo.id,
        });
      } else {
        pens.forEach((pen) => {
          const actual = woAnimals.filter((a) => (a.sort_dest_pen || pen) === pen).length;
          const isSortDest = sortPens.has(pen);
          let status: PenRow["status"];
          if (isSortDest) status = "sort";
          else if (!wo.work_complete) status = "pending";
          else if (actual >= headPerPen) status = "matched";
          else status = "short";

          rows.push({ pen, customerName: (wo.customer_id && customerMap?.[wo.customer_id]) || (wo.buyer_num ? `#${wo.buyer_num}` : "No Customer"), expected: headPerPen, actual, status, woId: wo.id });
        });
      }
    });
    return rows;
  }, [workOrders, animals, sortRecords]);

  const counts = useMemo(() => {
    const c = { matched: 0, short: 0, pending: 0, sort: 0 };
    penRows.forEach((r) => c[r.status]++);
    return c;
  }, [penRows]);

  const worked = penRows.filter((r) => r.status !== "pending");
  const pending = penRows.filter((r) => r.status === "pending");

  if (activeTab !== "Reconciliation") return null;

  const SectionHead: React.FC<{ title: string; count: number }> = ({ title, count }) => (
    <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "14px 0 8px" }}>
      <span style={{ fontSize: 13, fontWeight: 700, color: "#0E2646" }}>{title}</span>
      <div style={{ flex: 1, height: 1, background: "rgba(26,26,26,0.08)" }} />
      <span style={{ fontSize: 12, fontWeight: 600, color: "rgba(26,26,26,0.35)" }}>{count}</span>
    </div>
  );

  return (
    <div style={{ marginTop: 14 }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
        {(["matched", "short", "pending", "sort"] as const).map((s) => (
          <span
            key={s}
            style={{
              padding: "6px 14px", borderRadius: 9999, fontSize: 12, fontWeight: 700,
              background: statusColors[s].bg, border: `1px solid ${statusColors[s].border}`,
              color: statusColors[s].text, textTransform: "capitalize",
            }}
          >
            {s} {counts[s]}
          </span>
        ))}
      </div>

      {worked.length > 0 && <SectionHead title="Worked Pens" count={worked.length} />}
      {worked.map((row, i) => {
        const sc = statusColors[row.status];
        return (
          <div
            key={`${row.woId}-${row.pen}-${i}`}
            style={{
              background: "#FFFFFF", borderRadius: 10, marginBottom: 6,
              padding: "10px 14px", border: `1px solid ${sc.border}`,
              display: "flex", alignItems: "center", justifyContent: "space-between",
            }}
          >
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 16, fontWeight: 700, color: "#0E2646" }}>{row.pen}</span>
                <span style={{
                  fontSize: 9, fontWeight: 700, letterSpacing: "0.06em", borderRadius: 9999,
                  padding: "2px 8px", background: sc.bg, color: sc.text, textTransform: "uppercase",
                }}>
                  {row.status}
                </span>
              </div>
              <div style={{ fontSize: 12, fontWeight: 400, color: "#717182", marginTop: 2 }}>{row.customerName}</div>
            </div>
            <div style={{ display: "flex", gap: 20, textAlign: "center" }}>
              <div>
                <div style={{ fontSize: 10, fontWeight: 600, color: "rgba(26,26,26,0.35)", letterSpacing: "0.06em" }}>EXP</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: "#1A1A1A" }}>{row.expected}</div>
              </div>
              <div>
                <div style={{ fontSize: 10, fontWeight: 600, color: "rgba(26,26,26,0.35)", letterSpacing: "0.06em" }}>ACT</div>
                <div style={{
                  fontSize: 16, fontWeight: 700,
                  color: row.status === "matched" ? "#55BAAA" : row.status === "short" ? "#B8860B" : "#1A1A1A",
                }}>
                  {row.actual}
                </div>
              </div>
            </div>
          </div>
        );
      })}

      {pending.length > 0 && <SectionHead title="Pending" count={pending.length} />}
      {pending.map((row, i) => {
        const sc = statusColors[row.status];
        return (
          <div
            key={`pending-${row.woId}-${row.pen}-${i}`}
            style={{
              background: "#FFFFFF", borderRadius: 10, marginBottom: 6,
              padding: "10px 14px", border: `1px solid ${sc.border}`,
              display: "flex", alignItems: "center", justifyContent: "space-between",
            }}
          >
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 16, fontWeight: 700, color: "#0E2646" }}>{row.pen}</span>
                <span style={{
                  fontSize: 9, fontWeight: 700, letterSpacing: "0.06em", borderRadius: 9999,
                  padding: "2px 8px", background: sc.bg, color: sc.text, textTransform: "uppercase",
                }}>
                  PENDING
                </span>
              </div>
              <div style={{ fontSize: 12, fontWeight: 400, color: "#717182", marginTop: 2 }}>{row.customerName}</div>
            </div>
            <div style={{ display: "flex", gap: 20, textAlign: "center" }}>
              <div>
                <div style={{ fontSize: 10, fontWeight: 600, color: "rgba(26,26,26,0.35)", letterSpacing: "0.06em" }}>EXP</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: "#1A1A1A" }}>{row.expected}</div>
              </div>
              <div>
                <div style={{ fontSize: 10, fontWeight: 600, color: "rgba(26,26,26,0.35)", letterSpacing: "0.06em" }}>ACT</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: "#1A1A1A" }}>{row.actual}</div>
              </div>
            </div>
          </div>
        );
      })}

      {penRows.length === 0 && (
        <div style={{ textAlign: "center", padding: "30px 0", color: "rgba(26,26,26,0.35)", fontSize: 14 }}>
          No pen data to reconcile
        </div>
      )}
    </div>
  );
};

// ── REPORTS TAB ──
const REPORTS = [
  { letter: "P", title: "Preg Cows by Designation", desc: "Per seller: pregnant count grouped by tag color", who: "Sale barn office" },
  { letter: "D", title: "Daily Designation Totals", desc: "Total head by designation key across all sellers", who: "Sale barn office" },
  { letter: "B", title: "Billing Summary", desc: "Seller vs buyer charges with Vet/Admin/SOL breakdown", who: "Office + CATL" },
  { letter: "H", title: "Head Count by Work Type", desc: "Total head by work type for the day", who: "CATL + office" },
  { letter: "C", title: "CVI Prep Sheet", desc: "Interstate animals: EID, Back Tag, Tag #, buyer, destination", who: "Veterinarian" },
  { letter: "S", title: "Sort Pen Manifest", desc: "Per sort pen: head by buyer/seller, source pen", who: "Office + pen workers" },
  { letter: "O", title: "State Ownership Report", desc: "All cattle processed — Excel export", who: "State vet office" },
];

const ReportsTab: React.FC<{ activeTab: string; showToast: (v: string, m: string) => void }> = ({ activeTab, showToast }) => {
  if (activeTab !== "Reports") return null;

  return (
    <div style={{ marginTop: 14 }}>
      {REPORTS.map((r) => (
        <button
          key={r.letter}
          className="active:scale-[0.98]"
          onClick={() => showToast("info", `Report: ${r.title} — coming soon`)}
          style={{
            display: "flex", alignItems: "center", gap: 12, width: "100%",
            background: "#FFFFFF", borderRadius: 10,
            border: "1px solid rgba(212,212,208,0.60)",
            padding: "12px 14px", marginBottom: 8,
            cursor: "pointer", textAlign: "left",
          }}
        >
          <div style={{
            width: 40, height: 40, borderRadius: 10,
            background: "rgba(14,38,70,0.06)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 14, fontWeight: 700, color: "#0E2646", flexShrink: 0,
          }}>
            {r.letter}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: "#1A1A1A" }}>{r.title}</div>
            <div style={{ fontSize: 12, fontWeight: 400, color: "#717182", marginTop: 1 }}>{r.desc}</div>
            <div style={{ fontSize: 11, fontWeight: 500, color: "#55BAAA", marginTop: 2 }}>{r.who}</div>
          </div>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
            <path d="M6 4L10 8L6 12" stroke="rgba(26,26,26,0.25)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      ))}
    </div>
  );
};

// ── Flag SVG helper ──
const FlagSvg: React.FC<{ size?: number; fill?: string; stroke?: string }> = ({ size = 14, fill = "none", stroke = "#717182" }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
    <line x1="2" y1="2" x2="2" y2="14" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" />
    <path d="M2 2.5H12L10 5.5L12 8.5H2V2.5Z" fill={fill} stroke={stroke} strokeWidth="1.2" strokeLinejoin="round" />
  </svg>
);

// ── Flagged Notes Banner ──
const FlaggedNotesBanner: React.FC<{
  workOrders: WorkOrder[];
  customerMap?: Record<string, string>;
  showToast: (v: string, m: string) => void;
}> = ({ workOrders, customerMap, showToast }) => {
  const qc = useQueryClient();
  const [expanded, setExpanded] = useState(true);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [replyAuthor, setReplyAuthor] = useState<"Office" | "CATL">("Office");
  const [sending, setSending] = useState(false);

  const woIds = useMemo(() => workOrders.map(wo => wo.id), [workOrders]);
  const woMap = useMemo(() => {
    const m: Record<string, WorkOrder> = {};
    workOrders.forEach(wo => { m[wo.id] = wo; });
    return m;
  }, [workOrders]);

  const { data: flaggedNotes } = useQuery({
    queryKey: ["flagged_notes", woIds],
    enabled: woIds.length > 0,
    queryFn: async () => {
      const { data } = await (supabase.from("work_order_notes") as any)
        .select("*")
        .in("work_order_id", woIds)
        .eq("is_flagged", true)
        .order("created_at", { ascending: false });
      return (data ?? []) as unknown as WorkOrderNote[];
    },
  });

  const notes = flaggedNotes ?? [];
  const flaggedIds = useMemo(() => notes.map(n => n.id), [notes]);

  // Fetch replies to flagged notes
  const { data: repliesData } = useQuery({
    queryKey: ["flagged_replies", flaggedIds],
    enabled: flaggedIds.length > 0,
    queryFn: async () => {
      const { data } = await (supabase.from("work_order_notes") as any)
        .select("*")
        .in("parent_id", flaggedIds)
        .order("created_at", { ascending: true });
      return (data ?? []) as unknown as (WorkOrderNote & { parent_id: string })[];
    },
  });

  const repliesByParent = useMemo(() => {
    const m: Record<string, (WorkOrderNote & { parent_id: string })[]> = {};
    (repliesData ?? []).forEach(r => {
      if (!m[r.parent_id]) m[r.parent_id] = [];
      m[r.parent_id].push(r);
    });
    return m;
  }, [repliesData]);

  const unresolved = notes.filter(n => !n.resolved_at);
  const resolved = notes.filter(n => !!n.resolved_at);
  const sorted = [...unresolved, ...resolved];

  if (unresolved.length === 0) return null;

  const handleResolve = async (noteId: string) => {
    await (supabase.from("work_order_notes") as any)
      .update({ resolved_at: new Date().toISOString(), resolved_by: "Office" })
      .eq("id", noteId);
    qc.invalidateQueries({ queryKey: ["flagged_notes"] });
    qc.invalidateQueries({ queryKey: ["flagged_replies"] });
    showToast("success", "Note resolved");
  };

  const handleSendReply = async (parentNote: WorkOrderNote) => {
    if (!replyText.trim() || sending) return;
    setSending(true);
    await (supabase.from("work_order_notes") as any).insert({
      work_order_id: parentNote.work_order_id,
      parent_id: parentNote.id,
      author: replyAuthor,
      text: replyText.trim(),
      is_flagged: false,
    });
    setSending(false);
    setReplyText("");
    setReplyingTo(null);
    qc.invalidateQueries({ queryKey: ["flagged_replies"] });
    showToast("success", "Reply sent");
  };

  const fmtTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
  };

  const ReplySvg = () => (
    <svg width="10" height="10" viewBox="0 0 16 16" fill="none">
      <path d="M6 3L2 7L6 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M2 7H10C12.2 7 14 8.8 14 11V13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );

  return (
    <div style={{ background: "#FFF8E6", borderBottom: "2px solid #F3D12A", padding: "10px 16px", marginLeft: -16, marginRight: -16 }}>
      <button
        onClick={() => setExpanded(!expanded)}
        style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          width: "100%", background: "none", border: "none", cursor: "pointer", padding: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <FlagSvg size={18} fill="#F3D12A" stroke="#B8860B" />
          <span style={{ fontSize: 14, fontWeight: 700, color: "#1A1A1A" }}>Flagged notes</span>
          <span style={{
            fontSize: 10, fontWeight: 700, color: "#FFFFFF", background: "#B8860B",
            borderRadius: 9999, padding: "2px 7px", minWidth: 16, textAlign: "center",
          }}>{unresolved.length}</span>
        </div>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none"
          style={{ transition: "transform 200ms", transform: expanded ? "rotate(180deg)" : "rotate(0deg)" }}>
          <path d="M4 6L8 10L12 6" stroke="#717182" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {expanded && (
        <div style={{ marginTop: 10 }}>
          {sorted.map(note => {
            const wo = woMap[note.work_order_id];
            const isResolved = !!note.resolved_at;
            const isCatl = note.author?.toUpperCase() === "CATL";
            const custName = wo?.customer_id && customerMap?.[wo.customer_id]
              ? customerMap[wo.customer_id]
              : wo?.buyer_num ? `#${wo.buyer_num}` : "Unknown";
            const replies = repliesByParent[note.id] ?? [];
            const isReplying = replyingTo === note.id;

            return (
              <div key={note.id} style={{ opacity: isResolved ? 0.55 : 1 }}>
                <div style={{
                  background: "#FFFFFF", borderRadius: 10, padding: "10px 12px",
                  border: isResolved ? "1px solid #D4D4D0" : "1.5px solid #F3D12A",
                  marginBottom: replies.length > 0 || isReplying ? 0 : 8,
                  borderBottomLeftRadius: (replies.length > 0 || isReplying) ? 0 : 10,
                  borderBottomRightRadius: (replies.length > 0 || isReplying) ? 0 : 10,
                }}>
                  {/* Row 1: Badge + Customer */}
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                    <span style={{
                      fontSize: 9, fontWeight: 700, letterSpacing: "0.06em", borderRadius: 9999,
                      padding: "2px 8px", textTransform: "uppercase",
                      background: wo?.entity_type === "buyer" ? "rgba(85,186,170,0.15)" : "rgba(243,209,42,0.12)",
                      color: wo?.entity_type === "buyer" ? "#55BAAA" : "#B8860B",
                    }}>
                      {wo?.entity_type === "buyer" ? "BUYER" : "SELLER"}
                    </span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: "#1A1A1A" }}>{custName}</span>
                  </div>
                  {/* Row 2: Note text */}
                  <div style={{ fontSize: 13, color: "#1A1A1A", lineHeight: 1.4, marginBottom: 4 }}>{note.text}</div>
                  {/* Row 3: Author + time + buttons */}
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: isCatl ? "#55BAAA" : "#0E2646" }}>{note.author}</span>
                    <span style={{ fontSize: 11, color: "#717182" }}>{fmtTime(note.created_at)}</span>
                    <div style={{ flex: 1 }} />
                    {isResolved ? (
                      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                          <path d="M2.5 6L5 8.5L9.5 3.5" stroke="#55BAAA" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        <span style={{ fontSize: 11, fontWeight: 600, color: "#55BAAA" }}>
                          Resolved · {note.resolved_by} {fmtTime(note.resolved_at!)}
                        </span>
                      </div>
                    ) : (
                      <div style={{ display: "flex", gap: 6 }}>
                        <button
                          onClick={() => { setReplyingTo(isReplying ? null : note.id); setReplyText(""); setReplyAuthor("Office"); }}
                          style={{
                            display: "flex", alignItems: "center", gap: 4,
                            border: "1px solid #0E2646", background: "transparent", color: "#0E2646",
                            fontSize: 11, fontWeight: 600, padding: "4px 12px", borderRadius: 9999, cursor: "pointer",
                          }}
                        >
                          <ReplySvg /> Reply
                        </button>
                        <button
                          onClick={() => handleResolve(note.id)}
                          style={{
                            border: "1px solid #55BAAA", background: "transparent", color: "#55BAAA",
                            fontSize: 11, fontWeight: 600, padding: "4px 12px", borderRadius: 9999, cursor: "pointer",
                          }}
                        >Resolve</button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Replies thread */}
                {(replies.length > 0 || isReplying) && (
                  <div style={{ paddingLeft: 16, marginBottom: 8 }}>
                    {replies.map(reply => {
                      const rCatl = reply.author?.toUpperCase() === "CATL";
                      return (
                        <div key={reply.id} style={{
                          background: "rgba(14,38,70,0.03)", borderRadius: 8,
                          padding: "8px 10px", marginBottom: 4,
                        }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                            <span style={{ fontSize: 11, fontWeight: 700, color: rCatl ? "#55BAAA" : "#0E2646" }}>{reply.author}</span>
                            <span style={{ fontSize: 11, color: "#717182" }}>{fmtTime(reply.created_at)}</span>
                          </div>
                          <div style={{ fontSize: 12, color: "#1A1A1A", lineHeight: 1.4 }}>{reply.text}</div>
                        </div>
                      );
                    })}

                    {/* Reply input */}
                    {isReplying && !isResolved && (
                      <div style={{
                        background: "#FFFFFF", borderRadius: 8, border: "1px solid #D4D4D0",
                        padding: 8, marginTop: 4, marginBottom: 8,
                      }}>
                        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                          <input
                            value={replyText}
                            onChange={e => setReplyText(e.target.value)}
                            onKeyDown={e => { if (e.key === "Enter") handleSendReply(note); }}
                            placeholder="Reply to this note..."
                            style={{
                              flex: 1, height: 36, borderRadius: 8, border: "1px solid #D4D4D0",
                              fontSize: 16, fontFamily: "Inter, sans-serif", padding: "0 12px",
                              outline: "none", minWidth: 0,
                            }}
                          />
                          <div style={{ display: "flex", gap: 2, flexShrink: 0 }}>
                            {(["Office", "CATL"] as const).map(a => (
                              <button
                                key={a}
                                onClick={() => setReplyAuthor(a)}
                                style={{
                                  fontSize: 10, fontWeight: 600, color: "#FFFFFF", padding: "4px 8px",
                                  borderRadius: 9999, border: "none", cursor: "pointer",
                                  background: replyAuthor === a
                                    ? (a === "Office" ? "#0E2646" : "#55BAAA")
                                    : "rgba(26,26,26,0.15)",
                                }}
                              >{a}</button>
                            ))}
                          </div>
                          <button
                            onClick={() => handleSendReply(note)}
                            disabled={!replyText.trim() || sending}
                            style={{
                              height: 32, borderRadius: 8, background: "#0E2646", color: "#FFFFFF",
                              fontSize: 12, fontWeight: 600, padding: "0 14px", border: "none",
                              cursor: !replyText.trim() || sending ? "not-allowed" : "pointer",
                              opacity: !replyText.trim() || sending ? 0.5 : 1, flexShrink: 0,
                            }}
                          >Send</button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

const SaleDayDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { operationId } = useOperation();
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

  // Fetch customer names for work orders
  const customerIds = useMemo(() => {
    const ids = workOrders.map(wo => wo.customer_id).filter((cid): cid is string => !!cid);
    return [...new Set(ids)];
  }, [workOrders]);

  const { data: customerMap } = useQuery({
    queryKey: ["wo_customers", customerIds],
    enabled: customerIds.length > 0,
    queryFn: async () => {
      const { data } = await (supabase.from("sale_barn_customers") as any)
        .select("id, name")
        .in("id", customerIds);
      const map: Record<string, string> = {};
      (data ?? []).forEach((c: any) => { map[c.id] = c.name; });
      return map;
    },
  });

  const getCustomerName = (wo: WorkOrder) => {
    if (wo.customer_id && customerMap?.[wo.customer_id]) return customerMap[wo.customer_id];
    if (wo.buyer_num) return `#${wo.buyer_num}`;
    return null;
  };

  // Flagged notes count per work order
  const woIds = useMemo(() => workOrders.map(wo => wo.id), [workOrders]);
  const { data: flaggedCountMap } = useQuery({
    queryKey: ["flagged_notes_counts", woIds],
    enabled: woIds.length > 0,
    queryFn: async () => {
      const { data } = await (supabase.from("work_order_notes") as any)
        .select("work_order_id, id, resolved_at")
        .in("work_order_id", woIds)
        .eq("is_flagged", true);
      const map: Record<string, number> = {};
      (data ?? []).forEach((n: any) => {
        if (!n.resolved_at) {
          map[n.work_order_id] = (map[n.work_order_id] || 0) + 1;
        }
      });
      return map;
    },
  });

  const { data: consignmentsResult } = useConsignments(id, saleDay?.date);
  const consignments = consignmentsResult?.data ?? [];

  const [activeTab, setActiveTab] = useState<string>("Work Orders");
  const [woFilter, setWoFilter] = useState<string>("all");
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
        (wo.group_notes || "").toLowerCase().includes(q) ||
        (wo.customer_id && customerMap?.[wo.customer_id] || "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [workOrders, woFilter, woSearch, customerMap]);

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
      {/* Flagged Notes Alert Banner */}
      <FlaggedNotesBanner workOrders={workOrders} customerMap={customerMap} showToast={showToast} />

      {/* 2x2 Stat Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, padding: "0 0 12px" }}>
        {/* Consignments */}
        <button
          onClick={() => navigate(`/sale-barn/${id}/consignments`)}
          className="active:scale-[0.97]"
          style={{
            background: "#0E2646", borderRadius: 12, padding: 14, minHeight: 80,
            display: "flex", flexDirection: "column", justifyContent: "flex-end",
            border: "none", cursor: "pointer", textAlign: "left",
          }}
        >
          <div style={{ fontSize: 22, fontWeight: 700, color: "#FFFFFF", lineHeight: 1 }}>
            {consignments.filter((c) => c.status === "pending" || c.status === "arrived").length}
          </div>
          <div style={{ fontSize: 11, fontWeight: 500, color: "rgba(240,240,240,0.55)", marginTop: 4 }}>Consignments</div>
        </button>

        {/* Total Head */}
        <button
          onClick={() => navigate(`/sale-barn/${id}/animals`)}
          className="active:scale-[0.97]"
          style={{
            background: "#0E2646", borderRadius: 12, padding: 14, minHeight: 80,
            display: "flex", flexDirection: "column", justifyContent: "flex-end",
            border: "none", cursor: "pointer", textAlign: "left",
          }}
        >
          <div style={{ fontSize: 22, fontWeight: 700, color: "#FFFFFF", lineHeight: 1 }}>
            {stats.totalHead}
          </div>
          <div style={{ fontSize: 11, fontWeight: 500, color: "rgba(240,240,240,0.55)", marginTop: 4 }}>Total Head</div>
        </button>

        {/* Revenue */}
        <button
          onClick={() => navigate(`/sale-barn/${id}/billing`)}
          className="active:scale-[0.97]"
          style={{
            background: "#0E2646", borderRadius: 12, padding: 14, minHeight: 80,
            display: "flex", flexDirection: "column", justifyContent: "flex-end",
            border: "none", cursor: "pointer", textAlign: "left",
          }}
        >
          <div style={{ fontSize: 22, fontWeight: 700, color: "#FFFFFF", lineHeight: 1 }}>
            {fmtCurrency(stats.totalCharge)}
          </div>
          <div style={{ fontSize: 11, fontWeight: 500, color: "rgba(240,240,240,0.55)", marginTop: 4 }}>Revenue</div>
        </button>

        {/* Reports */}
        <button
          onClick={() => navigate(`/sale-barn/${id}/reports`)}
          className="active:scale-[0.97]"
          style={{
            background: "#0E2646", borderRadius: 12, padding: 14, minHeight: 80,
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
            border: "none", cursor: "pointer",
          }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            <polyline points="14,2 14,8 20,8" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            <line x1="16" y1="13" x2="8" y2="13" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" />
            <line x1="16" y1="17" x2="8" y2="17" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <div style={{ fontSize: 11, fontWeight: 500, color: "rgba(240,240,240,0.55)", marginTop: 6 }}>Reports</div>
        </button>
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
          <div style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap" }}>
            {WO_FILTERS.map((f) => (
              <button
                key={f}
                className="active:scale-[0.97]"
                onClick={() => setWoFilter(f)}
                style={{
                  height: 32, borderRadius: 9999, padding: "0 14px",
                  fontSize: 13, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap",
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
                        {getCustomerName(wo) || <em style={{ fontWeight: 400, opacity: 0.5 }}>No Customer</em>}
                      </span>
                      <span style={{
                        fontSize: 9, fontWeight: 700, letterSpacing: "0.06em", borderRadius: 9999,
                        padding: "3px 8px",
                        background: wo.entity_type === "seller" ? "rgba(243,209,42,0.12)" : "rgba(85,186,170,0.15)",
                        color: wo.entity_type === "seller" ? "#F3D12A" : "#55BAAA",
                      }}>
                        {wo.entity_type === "seller" ? "SELLER" : "BUYER"}
                      </span>
                      {(flaggedCountMap?.[wo.id] ?? 0) > 0 && (
                        <span style={{
                          padding: "3px 6px", borderRadius: 9999,
                          background: "rgba(243,209,42,0.25)",
                          display: "flex", alignItems: "center", justifyContent: "center",
                        }}>
                          <FlagSvg size={10} fill="#F3D12A" stroke="#F3D12A" />
                        </span>
                      )}
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

      <ReconciliationTab workOrders={workOrders} saleDayId={id!} activeTab={activeTab} customerMap={customerMap} />
    </div>
  );
};

export default SaleDayDetail;
