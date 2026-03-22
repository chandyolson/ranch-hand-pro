import React, { useState, useRef, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOperation } from "@/contexts/OperationContext";
import { useConsignments } from "@/hooks/sale-barn/useConsignments";
import { useChuteSideToast as useToast } from "@/components/ToastContext";
import FieldRow from "@/components/calving/FieldRow";
import type { Consignment, SaleDay } from "@/types/sale-barn";

const ANIMAL_TYPES = ["Bred Heifers", "Feeder Calves", "Pairs", "Bull", "Bred Cows", "Weigh Up Cows", "Baby Calf", "Heifers", "Yearling Bull"];
const STATUS_FILTERS = ["All", "Pending", "Arrived", "Converted", "Cancelled"] as const;
const STATUS_ORDER: Record<string, number> = { pending: 0, arrived: 1, converted: 2, cancelled: 3 };

const BADGE: Record<string, { bg: string; text: string }> = {
  pending: { bg: "rgba(243,209,42,0.12)", text: "#B8860B" },
  arrived: { bg: "rgba(85,186,170,0.15)", text: "#55BAAA" },
  converted: { bg: "rgba(14,38,70,0.08)", text: "#0E2646" },
  cancelled: { bg: "rgba(26,26,26,0.06)", text: "#717182" },
};

const IS: React.CSSProperties = {
  height: 36, borderRadius: 8, border: "1px solid #D4D4D0",
  fontSize: 16, fontFamily: "Inter, sans-serif", padding: "0 12px",
  outline: "none", width: "100%", boxSizing: "border-box",
};

const fmtDate = (iso: string) => {
  const d = new Date(iso + "T12:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

// ── Customer Typeahead ──
const CustomerSearch: React.FC<{
  operationId: string; value: string; customerId: string | null;
  onChange: (name: string, id: string | null) => void;
}> = ({ operationId, value, customerId, onChange }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { data: suggestions } = useQuery({
    queryKey: ["consign_cust_search", operationId, value],
    enabled: value.length >= 2 && !customerId,
    queryFn: async () => {
      const { data } = await (supabase.from("sale_barn_customers") as any)
        .select("id, name").eq("operation_id", operationId)
        .ilike("name", `%${value}%`).limit(8);
      return (data ?? []) as { id: string; name: string }[];
    },
  });
  return (
    <div ref={ref} style={{ position: "relative", width: "100%" }}>
      <input style={IS} value={value} placeholder="Search customers…"
        onFocus={() => { if (!customerId && value.length >= 2) setOpen(true); }}
        onChange={e => { onChange(e.target.value, null); setOpen(true); }}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
      />
      {open && (suggestions?.length ?? 0) > 0 && (
        <div style={{ position: "absolute", top: 38, left: 0, right: 0, background: "#fff", border: "1px solid #D4D4D0", borderRadius: 8, zIndex: 20, maxHeight: 180, overflowY: "auto", boxShadow: "0 4px 12px rgba(0,0,0,0.10)" }}>
          {suggestions!.map(s => (
            <div key={s.id} style={{ padding: "8px 12px", fontSize: 14, cursor: "pointer" }}
              onMouseDown={() => { onChange(s.name, s.id); setOpen(false); }}>{s.name}</div>
          ))}
        </div>
      )}
    </div>
  );
};

const ConsignmentsPage: React.FC = () => {
  const { id: saleDayId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { operationId } = useOperation();
  const { showToast } = useToast();
  const qc = useQueryClient();

  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState<typeof STATUS_FILTERS[number]>("All");

  // Fetch sale day
  const { data: saleDay } = useQuery({
    queryKey: ["sale_day", saleDayId],
    queryFn: async () => {
      const { data } = await (supabase.from("sale_days") as any).select("*").eq("id", saleDayId).single();
      return data as SaleDay | null;
    },
  });

  const { data: consignData } = useConsignments(saleDayId, saleDay?.date);
  const consignments = consignData?.data ?? [];

  // Form state
  const [custName, setCustName] = useState("");
  const [custId, setCustId] = useState<string | null>(null);
  const [headCount, setHeadCount] = useState("");
  const [animalType, setAnimalType] = useState("");
  const [expectedDate, setExpectedDate] = useState(saleDay?.date ?? new Date().toISOString().slice(0, 10));
  const [takenBy, setTakenBy] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  // Update expectedDate when saleDay loads
  React.useEffect(() => {
    if (saleDay?.date && !showForm) setExpectedDate(saleDay.date);
  }, [saleDay?.date]);

  const resetForm = () => {
    setCustName(""); setCustId(null); setHeadCount(""); setAnimalType("");
    setExpectedDate(saleDay?.date ?? new Date().toISOString().slice(0, 10));
    setTakenBy(""); setNotes("");
  };

  const handleSave = async () => {
    if (!custName.trim() || !headCount || parseInt(headCount) < 1) return;
    setSaving(true);
    const { error } = await (supabase.from("consignments") as any).insert({
      operation_id: operationId, sale_day_id: saleDayId,
      customer_id: custId, customer_name: custName.trim(),
      head_count: parseInt(headCount), animal_type: animalType || null,
      expected_sale_date: expectedDate || null, taken_by: takenBy.trim() || null,
      notes: notes.trim() || null, status: "pending",
    });
    setSaving(false);
    if (error) { toast("Error saving consignment"); return; }
    toast("Consignment saved");
    resetForm(); setShowForm(false);
    qc.invalidateQueries({ queryKey: ["consignments"] });
  };

  const markArrived = async (c: Consignment) => {
    await (supabase.from("consignments") as any).update({ status: "arrived" }).eq("id", c.id);
    qc.invalidateQueries({ queryKey: ["consignments"] });
    toast("Marked as arrived");
  };

  const createWorkOrder = (c: Consignment) => {
    const params = new URLSearchParams();
    if (c.customer_id) params.set("customer_id", c.customer_id);
    if (c.customer_name) params.set("customer", c.customer_name);
    if (c.head_count) params.set("headCount", String(c.head_count));
    if (c.animal_type) params.set("animalType", c.animal_type);
    navigate(`/sale-barn/${saleDayId}/work-order/new?${params.toString()}`);
  };

  const filtered = useMemo(() => {
    let list = [...consignments];
    if (filter !== "All") list = list.filter(c => c.status === filter.toLowerCase());
    list.sort((a, b) => {
      const so = (STATUS_ORDER[a.status] ?? 9) - (STATUS_ORDER[b.status] ?? 9);
      if (so !== 0) return so;
      return (a.expected_sale_date ?? "").localeCompare(b.expected_sale_date ?? "");
    });
    return list;
  }, [consignments, filter]);

  const filterCounts = useMemo(() => {
    const m: Record<string, number> = { All: consignments.length };
    for (const c of consignments) m[c.status] = (m[c.status] ?? 0) + 1;
    return m;
  }, [consignments]);

  return (
    <div style={{ padding: "0 16px 24px", fontFamily: "Inter, sans-serif" }}>
      {/* Toolbar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <span style={{ fontSize: 20, fontWeight: 800, color: "#0E2646" }}>Consignments</span>
        <button onClick={() => { setShowForm(p => !p); if (showForm) resetForm(); }}
          style={{ width: 36, height: 36, borderRadius: "50%", background: "#F3D12A", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span style={{ fontSize: 20, fontWeight: 700, color: "#1A1A1A", lineHeight: 1 }}>{showForm ? "×" : "+"}</span>
        </button>
      </div>

      {/* Add Form */}
      {showForm && (
        <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #F3D12A", boxShadow: "0 0 0 2px rgba(243,209,42,0.15)", padding: "12px 14px", marginBottom: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#0E2646", marginBottom: 8 }}>New Consignment</div>

          <FieldRow label="Customer">
            <CustomerSearch operationId={operationId} value={custName} customerId={custId}
              onChange={(n, id) => { setCustName(n); setCustId(id); }} />
          </FieldRow>

          <FieldRow label="Sale Date">
            <input type="date" style={IS} value={expectedDate}
              onChange={e => setExpectedDate(e.target.value)} />
          </FieldRow>

          <FieldRow label="Head Count">
            <input type="number" style={IS} min={1} value={headCount}
              onChange={e => setHeadCount(e.target.value)} placeholder="0" />
          </FieldRow>

          <FieldRow label="Animal Type">
            <select style={{ ...IS, appearance: "auto" }} value={animalType}
              onChange={e => setAnimalType(e.target.value)}>
              <option value="">— Select —</option>
              {ANIMAL_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </FieldRow>

          <FieldRow label="Taken By">
            <input style={IS} value={takenBy} onChange={e => setTakenBy(e.target.value)}
              placeholder="Who took the call" />
          </FieldRow>

          <FieldRow label="Notes">
            <textarea style={{ ...IS, height: "auto", padding: "8px 12px", resize: "vertical" }}
              rows={2} value={notes} onChange={e => setNotes(e.target.value)}
              placeholder="Any details from the caller" />
          </FieldRow>

          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
            <button onClick={() => { setShowForm(false); resetForm(); }}
              style={{ flex: 1, height: 38, borderRadius: 9999, border: "1px solid #D4D4D0", background: "transparent", fontSize: 13, fontWeight: 600, color: "#717182", cursor: "pointer" }}>
              Cancel
            </button>
            <button onClick={handleSave} disabled={saving || !custName.trim() || !headCount || parseInt(headCount) < 1}
              style={{ flex: 1, height: 38, borderRadius: 9999, border: "none", background: "#F3D12A", fontSize: 13, fontWeight: 700, color: "#1A1A1A", cursor: "pointer", boxShadow: "0 2px 8px rgba(243,209,42,0.30)", opacity: saving ? 0.6 : 1 }}>
              {saving ? "Saving…" : "Save Consignment"}
            </button>
          </div>
        </div>
      )}

      {/* Filter Pills */}
      <div style={{ display: "flex", gap: 6, marginBottom: 12, overflowX: "auto" }}>
        {STATUS_FILTERS.map(f => {
          const active = filter === f;
          const count = filterCounts[f === "All" ? "All" : f.toLowerCase()] ?? 0;
          return (
            <button key={f} onClick={() => setFilter(f)}
              style={{ height: 32, padding: "0 14px", borderRadius: 9999, border: active ? "none" : "1px solid #D4D4D0", background: active ? "#0E2646" : "transparent", color: active ? "#fff" : "#717182", fontSize: 13, fontWeight: 600, whiteSpace: "nowrap", cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
              {f} <span style={{ opacity: 0.6 }}>{count}</span>
            </button>
          );
        })}
      </div>

      {/* Cards */}
      {filtered.length === 0 && (
        <div style={{ textAlign: "center", padding: 32, color: "#717182", fontSize: 14 }}>
          No consignments found
        </div>
      )}
      {filtered.map(c => {
        const badge = BADGE[c.status] ?? BADGE.pending;
        return (
          <div key={c.id} style={{ background: "#fff", borderRadius: 12, border: "1px solid rgba(212,212,208,0.60)", padding: "12px 14px", marginBottom: 8 }}>
            {/* Row 1 */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 15, fontWeight: 600, color: "#1A1A1A" }}>{c.customer_name}</span>
              <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.06em", borderRadius: 9999, padding: "3px 8px", background: badge.bg, color: badge.text, textTransform: "uppercase" }}>
                {c.status}
              </span>
            </div>
            {/* Row 2 */}
            <div style={{ fontSize: 13, color: "#717182", marginTop: 2 }}>
              {c.expected_sale_date ? fmtDate(c.expected_sale_date) : <em>No date set</em>}
              {" · "}{c.head_count} hd
              {c.animal_type && ` · ${c.animal_type}`}
            </div>
            {/* Row 3 notes */}
            {c.notes && (
              <div style={{ fontSize: 12, color: "#717182", fontStyle: "italic", marginTop: 4 }}>{c.notes}</div>
            )}
            {/* Actions */}
            {(c.status === "pending" || c.status === "arrived") && (
              <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
                {c.status === "pending" && (
                  <button onClick={() => markArrived(c)}
                    style={{ background: "none", border: "none", fontSize: 13, fontWeight: 600, color: "#55BAAA", cursor: "pointer", padding: 0 }}>
                    Mark Arrived
                  </button>
                )}
                <button onClick={() => createWorkOrder(c)}
                  style={{ background: "none", border: "none", fontSize: 13, fontWeight: 600, color: "#B8860B", cursor: "pointer", padding: 0 }}>
                  Create Work Order →
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default ConsignmentsPage;
