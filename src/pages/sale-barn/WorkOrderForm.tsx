import React, { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOperation } from "@/contexts/OperationContext";
import { useSaleBarnPrices } from "@/hooks/sale-barn/useSaleBarnPrices";
import { useChuteSideToast as useToast } from "@/components/ToastContext";
import { focusGold, blurReset } from "@/lib/styles";
import type { SaleDay, WorkOrder, SaleBarnCustomer, WorkOrderNote } from "@/types/sale-barn";

const fmtDate = (iso: string) => {
  const d = new Date(iso + "T12:00:00");
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
};

const ANIMAL_TYPES = [
  "Bred Heifers", "Feeder Calves", "Pairs", "Bull", "Bred Cows",
  "Weigh Up Cows", "Baby Calf", "Heifers", "Yearling Bull",
];

const CARD: React.CSSProperties = {
  background: "#FFFFFF", borderRadius: 12,
  border: "1px solid rgba(212,212,208,0.60)",
  padding: "12px 14px", marginBottom: 10,
};

const LABEL: React.CSSProperties = {
  width: 85, flexShrink: 0, fontSize: 14, fontWeight: 600,
  color: "#1A1A1A", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
};

const INPUT: React.CSSProperties = {
  flex: 1, minWidth: 0, height: 36, borderRadius: 8,
  border: "1px solid #D4D4D0", fontSize: 16, padding: "0 12px",
  outline: "none", backgroundColor: "#FFFFFF", boxSizing: "border-box",
};

const FieldRow: React.FC<{ label: string; req?: boolean; children: React.ReactNode }> = ({ label, req, children }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0, marginBottom: 8 }}>
    <span style={LABEL}>
      {label}
      {req && <span style={{ color: "#9B2335", marginLeft: 2 }}>*</span>}
    </span>
    <div style={{ flex: 1, minWidth: 0, display: "flex", position: "relative" }}>{children}</div>
  </div>
);

// ── Toggle Switch ──
const ToggleSwitch: React.FC<{ on: boolean; onToggle: () => void }> = ({ on, onToggle }) => (
  <button
    type="button" onClick={onToggle}
    style={{
      width: 48, height: 28, borderRadius: 14, border: "none", cursor: "pointer",
      background: on ? "#55BAAA" : "#CBCED4", position: "relative",
      transition: "background 200ms",
    }}
  >
    <div style={{
      width: 22, height: 22, borderRadius: 11, background: "#FFFFFF",
      boxShadow: "0 1px 3px rgba(0,0,0,0.20)",
      position: "absolute", top: 3,
      left: on ? 23 : 3, transition: "left 200ms",
    }} />
  </button>
);

// ── Collapsible Section ──
const CollapsibleSection: React.FC<{
  title: string; badge?: number; defaultOpen?: boolean; children: React.ReactNode;
}> = ({ title, badge, defaultOpen = false, children }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={CARD}>
      <button
        type="button" onClick={() => setOpen(!open)}
        style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          width: "100%", background: "none", border: "none", cursor: "pointer", padding: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 15, fontWeight: 600, color: "#1A1A1A" }}>{title}</span>
          {badge !== undefined && badge > 0 && (
            <span style={{
              fontSize: 11, fontWeight: 700, color: "#FFFFFF", background: "#0E2646",
              borderRadius: 9999, padding: "1px 7px", minWidth: 18, textAlign: "center",
            }}>{badge}</span>
          )}
        </div>
        <svg
          width="18" height="18" viewBox="0 0 18 18" fill="none"
          style={{ transition: "transform 250ms", transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
        >
          <path d="M4.5 6.75L9 11.25L13.5 6.75" stroke="#717182" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      <div style={{
        maxHeight: open ? 1200 : 0, opacity: open ? 1 : 0,
        overflow: "hidden", transition: "max-height 250ms ease-in-out, opacity 250ms ease-in-out",
        marginTop: open ? 10 : 0,
      }}>
        {children}
      </div>
    </div>
  );
};

// ── Customer Typeahead ──
const CustomerSearch: React.FC<{
  operationId: string;
  selected: SaleBarnCustomer | null;
  onSelect: (c: SaleBarnCustomer | null) => void;
}> = ({ operationId, selected, onSelect }) => {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const { data: suggestions } = useQuery({
    queryKey: ["wo_cust_search", operationId, search],
    enabled: search.length >= 2 && !selected,
    queryFn: async () => {
      const { data } = await (supabase.from("sale_barn_customers") as any)
        .select("*").eq("operation_id", operationId)
        .ilike("name", `%${search}%`).limit(20);
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

  if (selected) {
    return (
      <div style={{
        ...INPUT, display: "flex", alignItems: "center", justifyContent: "space-between",
        background: "rgba(85,186,170,0.06)",
      }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: "#1A1A1A", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {selected.name}
        </span>
        <button onClick={() => { onSelect(null); setSearch(""); }} style={{
          background: "none", border: "none", cursor: "pointer", padding: "0 4px",
          fontSize: 16, color: "#717182", lineHeight: 1,
        }}>×</button>
      </div>
    );
  }

  return (
    <div ref={ref} style={{ flex: 1, minWidth: 0, position: "relative" }}>
      <input
        style={INPUT}
        placeholder="Search customer…"
        value={search}
        onChange={(e) => { setSearch(e.target.value); setOpen(true); }}
        onFocus={(e) => { focusGold(e); if (search.length >= 2) setOpen(true); }}
        onBlur={blurReset}
      />
      {open && suggestions && suggestions.length > 0 && (
        <div style={{
          position: "absolute", top: 40, left: 0, right: 0, zIndex: 50,
          background: "#FFFFFF", borderRadius: 10, border: "1px solid #D4D4D0",
          boxShadow: "0 4px 16px rgba(0,0,0,0.10)", maxHeight: 200, overflowY: "auto",
        }}>
          {suggestions.map((c) => (
            <button
              key={c.id}
              onMouseDown={() => { onSelect(c); setOpen(false); setSearch(c.name); }}
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

// ── Notes Thread ──
const NotesThread: React.FC<{ woId: string | undefined; showToast: (v: string, m: string) => void }> = ({ woId, showToast }) => {
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const { data: notes } = useQuery({
    queryKey: ["work_order_notes", woId],
    enabled: !!woId,
    queryFn: async () => {
      const { data } = await (supabase.from("work_order_notes") as any)
        .select("*").eq("work_order_id", woId!)
        .order("created_at", { ascending: true });
      return (data ?? []) as unknown as WorkOrderNote[];
    },
  });

  const addNote = useCallback(async () => {
    if (!text.trim() || !woId) return;
    setSubmitting(true);
    const { error } = await (supabase.from("work_order_notes") as any).insert({
      work_order_id: woId,
      author: "Office",
      text: text.trim(),
    });
    setSubmitting(false);
    if (error) { showToast("error", error.message); return; }
    setText("");
    qc.invalidateQueries({ queryKey: ["work_order_notes", woId] });
  }, [text, woId, qc, showToast]);

  const fmtTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
  };

  const notesList = notes ?? [];

  return (
    <CollapsibleSection title="Notes" badge={notesList.length} defaultOpen>
      {notesList.map((n) => {
        const isCatl = n.author?.toUpperCase() === "CATL";
        return (
          <div key={n.id} style={{
            padding: "8px 12px", borderRadius: 10, marginBottom: 6,
            borderLeft: `3px solid ${isCatl ? "#55BAAA" : "#0E2646"}`,
            background: isCatl ? "rgba(85,186,170,0.06)" : "rgba(14,38,70,0.04)",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: isCatl ? "#55BAAA" : "#0E2646" }}>{n.author}</span>
              <span style={{ fontSize: 11, color: "#717182" }}>{fmtTime(n.created_at)}</span>
            </div>
            <div style={{ fontSize: 13, color: "#1A1A1A", lineHeight: 1.4 }}>{n.text}</div>
          </div>
        );
      })}
      {woId && (
        <div style={{ display: "flex", gap: 6, marginTop: notesList.length > 0 ? 6 : 0 }}>
          <input
            style={INPUT}
            placeholder="Add a note…"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") addNote(); }}
            onFocus={focusGold} onBlur={blurReset}
          />
          <button
            type="button" onClick={addNote} disabled={submitting || !text.trim()}
            style={{
              height: 36, borderRadius: 8, background: "#0E2646", color: "#FFFFFF",
              fontSize: 13, fontWeight: 600, padding: "0 16px", border: "none",
              cursor: submitting ? "not-allowed" : "pointer", opacity: submitting ? 0.6 : 1,
            }}
          >
            Add
          </button>
        </div>
      )}
      {!woId && (
        <div style={{ fontSize: 12, color: "#717182", textAlign: "center", padding: "8px 0" }}>
          Save the work order first to add notes
        </div>
      )}
    </CollapsibleSection>
  );
};

// ── Label Preview ──
const LabelPreview: React.FC<{
  pen: string; customerName: string; buyerNum: string;
  headCount: number; workType: string; isBuyer: boolean;
  entityType: "seller" | "buyer";
  showToast: (v: string, m: string) => void;
}> = ({ pen, customerName, buyerNum, headCount, workType, isBuyer, entityType, showToast }) => (
  <CollapsibleSection title="Label Preview" defaultOpen={false}>
    <div style={{
      border: "2px dashed #D4D4D0", borderRadius: 10, padding: 16,
    }}>
      <div style={{ fontSize: 10, fontWeight: 600, color: "#717182", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 4 }}>
        DYMO PEN CARD
      </div>
      {customerName && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <span style={{ fontSize: 16, fontWeight: 700, color: "#1A1A1A" }}>{customerName}</span>
          <span style={{
            fontSize: 9, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase",
            borderRadius: 9999, padding: "2px 8px",
            background: entityType === "seller" ? "rgba(243,209,42,0.12)" : "rgba(85,186,170,0.15)",
            color: entityType === "seller" ? "#B8860B" : "#55BAAA",
          }}>
            {entityType}
          </span>
        </div>
      )}
      <div style={{ fontSize: 28, fontWeight: 800, color: "#1A1A1A", marginBottom: 2 }}>{pen || "—"}</div>
      {isBuyer && buyerNum && (
        <div style={{ fontSize: 14, fontWeight: 500, color: "#717182", marginBottom: 4 }}>#{buyerNum}</div>
      )}
      <div style={{ display: "flex", gap: 24, marginTop: 8 }}>
        <div>
          <div style={{ fontSize: 10, fontWeight: 600, color: "rgba(26,26,26,0.35)", letterSpacing: "0.06em" }}>HEAD</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: "#1A1A1A" }}>{headCount || 0}</div>
        </div>
        <div>
          <div style={{ fontSize: 10, fontWeight: 600, color: "rgba(26,26,26,0.35)", letterSpacing: "0.06em" }}>WORK</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: "#1A1A1A" }}>{workType || "—"}</div>
        </div>
      </div>
    </div>
    <button
      type="button"
      className="active:scale-[0.97]"
      onClick={() => showToast("info", "Print label sent to Dymo")}
      style={{
        width: "100%", height: 40, borderRadius: 9999, marginTop: 10,
        border: "1.5px solid #0E2646", background: "transparent",
        fontSize: 14, fontWeight: 600, color: "#0E2646",
        cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
      }}
    >
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M4 6V2h8v4M4 12H2.667A.667.667 0 0 1 2 11.333V8.667A.667.667 0 0 1 2.667 8h10.666a.667.667 0 0 1 .667.667v2.666a.667.667 0 0 1-.667.667H12M4 10h8v4H4v-4z"
          stroke="#0E2646" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      Print Label
    </button>
  </CollapsibleSection>
);

// ── Special Charges Calculator (Bottom Sheet) ──
interface CalcProduct {
  id: string;
  productId: string;
  productName: string;
  qty: number;
  unitCost: number;
}

const SpecialChargesSheet: React.FC<{
  open: boolean;
  onClose: () => void;
  onApply: (lumpSum: number) => void;
}> = ({ open, onClose, onApply }) => {
  const [rows, setRows] = useState<CalcProduct[]>([]);
  const [visible, setVisible] = useState(false);

  const { data: products } = useQuery({
    queryKey: ["products_for_calc"],
    enabled: open,
    queryFn: async () => {
      const { data } = await supabase.from("products").select("id, name, product_type");
      return data ?? [];
    },
  });

  // Default cost lookup from product_sizes
  const { data: productSizes } = useQuery({
    queryKey: ["product_sizes_for_calc"],
    enabled: open,
    queryFn: async () => {
      const { data } = await supabase.from("product_sizes").select("product_id, cost_per_dose, is_default");
      return data ?? [];
    },
  });

  const defaultCostMap = useMemo(() => {
    const m: Record<string, number> = {};
    (productSizes ?? []).forEach((ps: any) => {
      if (ps.is_default && ps.cost_per_dose != null) m[ps.product_id] = Number(ps.cost_per_dose);
      else if (ps.cost_per_dose != null && !(ps.product_id in m)) m[ps.product_id] = Number(ps.cost_per_dose);
    });
    return m;
  }, [productSizes]);

  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => setVisible(true));
    } else {
      setVisible(false);
    }
  }, [open]);

  const addRow = () => {
    setRows((prev) => [...prev, { id: crypto.randomUUID(), productId: "", productName: "", qty: 1, unitCost: 0 }]);
  };

  const removeRow = (id: string) => setRows((prev) => prev.filter((r) => r.id !== id));

  const updateRow = (id: string, patch: Partial<CalcProduct>) => {
    setRows((prev) => prev.map((r) => r.id === id ? { ...r, ...patch } : r));
  };

  const total = rows.reduce((s, r) => s + r.qty * r.unitCost, 0);

  if (!open) return null;

  return (
    <>
      {/* Overlay */}
      <div
        onClick={onClose}
        style={{
          position: "fixed", inset: 0, zIndex: 100,
          background: "rgba(0,0,0,0.52)",
          opacity: visible ? 1 : 0, transition: "opacity 250ms",
        }}
      />
      {/* Sheet */}
      <div style={{
        position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 101,
        background: "#FFFFFF", borderRadius: "20px 20px 0 0",
        boxShadow: "0 -4px 30px rgba(0,0,0,0.15)",
        maxHeight: "80vh", overflowY: "auto",
        transform: visible ? "translateY(0)" : "translateY(100%)",
        transition: "transform 300ms ease-out",
      }}>
        {/* Handle */}
        <div style={{ display: "flex", justifyContent: "center", padding: "10px 0 6px" }}>
          <div style={{ width: 40, height: 4, borderRadius: 2, background: "#D4D4D0" }} />
        </div>

        <div style={{ padding: "0 16px 20px" }}>
          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <span style={{ fontSize: 18, fontWeight: 700, color: "#0E2646" }}>Product Calculator</span>
            <button onClick={onClose} style={{
              width: 32, height: 32, borderRadius: 9999, border: "none",
              background: "rgba(26,26,26,0.06)", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 16, color: "#717182",
            }}>×</button>
          </div>

          {/* Product rows */}
          {rows.map((row) => (
            <div key={row.id} style={{
              background: "#F5F5F0", borderRadius: 10, padding: "10px 12px", marginBottom: 8,
            }}>
              <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6 }}>
                <select
                  style={{ ...INPUT, flex: 1, fontSize: 14 }}
                  value={row.productId}
                  onChange={(e) => {
                    const pid = e.target.value;
                    const pName = (products ?? []).find((p: any) => p.id === pid)?.name ?? "";
                    const cost = defaultCostMap[pid] ?? 0;
                    updateRow(row.id, { productId: pid, productName: pName, unitCost: cost });
                  }}
                >
                  <option value="">Select product…</option>
                  {(products ?? []).map((p: any) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
                <button onClick={() => removeRow(row.id)} style={{
                  width: 28, height: 28, borderRadius: 14, border: "none",
                  background: "rgba(212,24,61,0.06)", color: "#D4183D",
                  cursor: "pointer", fontSize: 14, fontWeight: 700,
                  display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                }}>×</button>
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 10, color: "#717182", marginBottom: 2 }}>Qty</div>
                  <input
                    type="number" min={1} value={row.qty}
                    onChange={(e) => updateRow(row.id, { qty: parseInt(e.target.value) || 0 })}
                    style={{ ...INPUT, width: "100%", flex: "none", fontSize: 14 }}
                    onFocus={focusGold} onBlur={blurReset}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 10, color: "#717182", marginBottom: 2 }}>Unit Cost</div>
                  <input
                    type="number" step="0.01" value={row.unitCost}
                    onChange={(e) => updateRow(row.id, { unitCost: parseFloat(e.target.value) || 0 })}
                    style={{ ...INPUT, width: "100%", flex: "none", fontSize: 14 }}
                    onFocus={focusGold} onBlur={blurReset}
                  />
                </div>
                <div style={{ flex: 1, textAlign: "right" }}>
                  <div style={{ fontSize: 10, color: "#717182", marginBottom: 2 }}>Line Total</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "#1A1A1A", paddingTop: 8 }}>
                    ${(row.qty * row.unitCost).toFixed(2)}
                  </div>
                </div>
              </div>
            </div>
          ))}

          {/* Add product */}
          <button
            type="button" onClick={addRow}
            style={{
              width: "100%", height: 40, borderRadius: 10,
              border: "1px dashed #D4D4D0", background: "transparent",
              color: "#55BAAA", fontSize: 13, fontWeight: 600,
              cursor: "pointer",
            }}
          >
            + Add Product
          </button>

          {/* Total bar */}
          <div style={{
            background: "#0E2646", borderRadius: 10, padding: "12px 14px", marginTop: 12,
            display: "flex", alignItems: "center", justifyContent: "space-between",
          }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: "rgba(240,240,240,0.65)" }}>Lump Sum Total</span>
            <span style={{ fontSize: 20, fontWeight: 700, color: "#F3D12A" }}>${total.toFixed(2)}</span>
          </div>

          {/* Apply */}
          <button
            type="button"
            className="active:scale-[0.97]"
            onClick={() => { onApply(total); }}
            style={{
              width: "100%", height: 48, borderRadius: 9999, marginTop: 12,
              background: "#F3D12A", border: "none",
              fontSize: 16, fontWeight: 700, color: "#1A1A1A",
              boxShadow: "0 2px 10px rgba(243,209,42,0.35)",
              cursor: "pointer",
            }}
          >
            Apply to Work Order
          </button>
        </div>
      </div>
    </>
  );
};

// ── Main Form ──
const WorkOrderForm: React.FC = () => {
  const { id: saleDayId, woId } = useParams<{ id: string; woId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { operationId } = useOperation();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const isEdit = !!woId;

  // Fetch sale day
  const { data: saleDay } = useQuery({
    queryKey: ["sale_day_detail", saleDayId],
    enabled: !!saleDayId,
    queryFn: async () => {
      const { data } = await (supabase.from("sale_days") as any).select("*").eq("id", saleDayId!).single();
      return data as unknown as SaleDay | null;
    },
  });

  // Fetch prices
  const { data: pricesData } = useSaleBarnPrices();
  const prices = pricesData?.data ?? [];

  // Fetch existing WO for edit
  const { data: existingWo } = useQuery({
    queryKey: ["work_order_edit", woId],
    enabled: isEdit,
    queryFn: async () => {
      const { data } = await (supabase.from("work_orders") as any).select("*").eq("id", woId!).single();
      return data as unknown as WorkOrder | null;
    },
  });

  // Form state
  const [customer, setCustomer] = useState<SaleBarnCustomer | null>(null);
  const [entityType, setEntityType] = useState<"seller" | "buyer">("seller");
  const [buyerNum, setBuyerNum] = useState("");
  const [workType, setWorkType] = useState("");
  const [animalType, setAnimalType] = useState("");
  const [pensStr, setPensStr] = useState("");
  const [headCount, setHeadCount] = useState("");
  const [workComplete, setWorkComplete] = useState(false);
  const [healthComplete, setHealthComplete] = useState(false);
  const [specialLumpSum, setSpecialLumpSum] = useState(0);
  const [calcOpen, setCalcOpen] = useState(false);
  const [groupNotes, setGroupNotes] = useState("");
  const [saving, setSaving] = useState(false);

  // Populate for edit
  useEffect(() => {
    if (!existingWo) return;
    setEntityType(existingWo.entity_type);
    setBuyerNum(existingWo.buyer_num || "");
    setWorkType(existingWo.work_type);
    setAnimalType(existingWo.animal_type || "");
    setPensStr((existingWo.pens || []).join(", "));
    setHeadCount(String(existingWo.head_count || ""));
    setWorkComplete(existingWo.work_complete);
    setHealthComplete(existingWo.health_complete);
    setSpecialLumpSum(existingWo.special_lump_sum || 0);
    setGroupNotes(existingWo.group_notes || "");
    if (existingWo.customer_id) {
      (supabase.from("sale_barn_customers") as any)
        .select("*").eq("id", existingWo.customer_id).single()
        .then(({ data }: any) => { if (data) setCustomer(data as SaleBarnCustomer); });
    }
  }, [existingWo]);

  // Pre-fill from query params (consignment flow)
  useEffect(() => {
    if (isEdit || existingWo) return;
    const qCustomer = searchParams.get("customer");
    const qHeadCount = searchParams.get("headCount");
    const qAnimalType = searchParams.get("animalType");
    if (qCustomer && !customer) {
      // Search for customer by name to get the full object
      (supabase.from("sale_barn_customers") as any)
        .select("*").eq("operation_id", operationId)
        .ilike("name", qCustomer).limit(1)
        .then(({ data }: any) => {
          if (data && data.length > 0) setCustomer(data[0] as SaleBarnCustomer);
        });
    }
    if (qHeadCount && !headCount) setHeadCount(qHeadCount);
    if (qAnimalType && !animalType) setAnimalType(qAnimalType);
  }, [searchParams, isEdit, existingWo]);

  // Price lookup & billing calc
  const priceRow = useMemo(() => {
    if (!workType) return null;
    return prices.find((p) => p.work_type === workType) ?? null;
  }, [workType, prices]);

  const hc = parseInt(headCount) || 0;
  const isSpecial = priceRow?.is_special === true;

  const billing = useMemo(() => {
    if (!priceRow || hc <= 0) return null;
    const vetBase = isSpecial && specialLumpSum > 0 ? specialLumpSum : priceRow.vet_charge * hc;
    const taxCharge = vetBase * (priceRow.tax_rate / 100);
    const vetTotal = vetBase + taxCharge;
    const adminCharge = vetTotal * (priceRow.admin_pct / 100);
    const solCharge = priceRow.sol_charge * hc;
    const totalCharge = vetTotal + adminCharge + solCharge;
    return { vetCharge: vetBase, taxCharge, vetTotal, adminCharge, solCharge, totalCharge };
  }, [priceRow, hc, isSpecial, specialLumpSum]);

  const handleSave = async () => {
    if (!customer) { showToast("error", "Select a customer"); return; }
    if (!workType) { showToast("error", "Select a work type"); return; }
    if (!animalType) { showToast("error", "Select an animal type"); return; }
    if (!pensStr.trim()) { showToast("error", "Enter pen(s)"); return; }
    if (hc < 1) { showToast("error", "Enter head count"); return; }

    setSaving(true);
    const pens = pensStr.split(",").map((s) => s.trim()).filter(Boolean);

    const row: Record<string, any> = {
      sale_day_id: saleDayId,
      customer_id: customer.id,
      entity_type: entityType,
      buyer_num: entityType === "buyer" ? buyerNum || null : null,
      work_type: workType,
      animal_type: animalType,
      pens,
      head_count: hc,
      vet_charge: billing?.vetCharge ?? 0,
      admin_charge: billing?.adminCharge ?? 0,
      sol_charge: billing?.solCharge ?? 0,
      tax_charge: billing?.taxCharge ?? 0,
      total_charge: billing?.totalCharge ?? 0,
      special_lump_sum: specialLumpSum,
      work_complete: workComplete,
      health_complete: healthComplete,
      group_notes: groupNotes.trim() || null,
    };

    let error: any;
    if (isEdit && woId) {
      ({ error } = await (supabase.from("work_orders") as any).update(row).eq("id", woId));
    } else {
      ({ error } = await (supabase.from("work_orders") as any).insert(row));
    }

    setSaving(false);
    if (error) {
      console.error("Work order save error:", error);
      showToast("error", error.message);
    } else {
      // If created from a consignment, mark it as converted
      const consignmentId = searchParams.get("consignmentId");
      if (consignmentId && !isEdit) {
        await (supabase.from("consignments") as any)
          .update({ status: "converted" })
          .eq("id", consignmentId);
        queryClient.invalidateQueries({ queryKey: ["consignments"] });
      }
      queryClient.invalidateQueries({ queryKey: ["work_orders", saleDayId] });
      showToast("success", isEdit ? "Work order updated" : "Work order created");
      navigate(`/sale-barn/${saleDayId}`);
    }
  };

  const fmt$ = (n: number) => "$" + n.toFixed(2);
  const firstPen = pensStr.split(",")[0]?.trim() || "";

  return (
    <div style={{ paddingBottom: 90 }}>
      {/* Customer Section */}
      <div style={CARD}>
        <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 12 }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: "#1A1A1A" }}>
            Customer<span style={{ color: "#9B2335", marginLeft: 2 }}>*</span>
          </span>
          <CustomerSearch operationId={operationId} selected={customer} onSelect={setCustomer} />
        </div>

        <FieldRow label="Type">
          <div style={{
            display: "flex", flex: 1, minWidth: 0, height: 36, borderRadius: 8,
            border: "1px solid #D4D4D0", overflow: "hidden", background: "#F3F3F5",
          }}>
            {(["seller", "buyer"] as const).map((t) => {
              const active = entityType === t;
              const bg = active ? (t === "seller" ? "#F3D12A" : "#55BAAA") : "transparent";
              const color = active ? (t === "seller" ? "#1A1A1A" : "#FFFFFF") : "#717182";
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => setEntityType(t)}
                  style={{
                    flex: 1, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600,
                    background: bg, color, textTransform: "capitalize",
                  }}
                >
                  {t}
                </button>
              );
            })}
          </div>
        </FieldRow>

        {entityType === "buyer" && (
          <FieldRow label="Buyer #">
            <input
              style={INPUT} placeholder="B-0000" value={buyerNum}
              onChange={(e) => setBuyerNum(e.target.value)}
              onFocus={focusGold} onBlur={blurReset}
            />
          </FieldRow>
        )}

        {customer?.address && (
          <FieldRow label="Address">
            <div style={{ fontSize: 14, color: "#717182", padding: "8px 0" }}>{customer.address}</div>
          </FieldRow>
        )}
      </div>

      {/* Work Section */}
      <div style={CARD}>
        <FieldRow label="Work Type" req>
          <select
            style={{ ...INPUT, appearance: "none", WebkitAppearance: "none" }}
            value={workType}
            onChange={(e) => setWorkType(e.target.value)}
            onFocus={focusGold as any} onBlur={blurReset as any}
          >
            <option value="">Select…</option>
            {prices.map((p) => (
              <option key={p.id} value={p.work_type}>{p.work_type}</option>
            ))}
          </select>
        </FieldRow>

        <FieldRow label="Animal Type" req>
          <select
            style={{ ...INPUT, appearance: "none", WebkitAppearance: "none" }}
            value={animalType}
            onChange={(e) => setAnimalType(e.target.value)}
            onFocus={focusGold as any} onBlur={blurReset as any}
          >
            <option value="">Select…</option>
            {ANIMAL_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </FieldRow>

        <FieldRow label="Pen(s)" req>
          <input
            style={INPUT} placeholder="e.g. 401, 402" value={pensStr}
            onChange={(e) => setPensStr(e.target.value)}
            onFocus={focusGold} onBlur={blurReset}
          />
        </FieldRow>

        <FieldRow label="Head Count" req>
          <input
            style={INPUT} type="number" min={1} placeholder="0" value={headCount}
            onChange={(e) => setHeadCount(e.target.value)}
            onFocus={focusGold} onBlur={blurReset}
          />
        </FieldRow>

        {isSpecial && (
          <button
            type="button"
            className="active:scale-[0.97]"
            onClick={() => setCalcOpen(true)}
            style={{
              width: "100%", height: 40, borderRadius: 10, marginTop: 4,
              border: "1.5px solid #55BAAA", background: "rgba(85,186,170,0.06)",
              color: "#55BAAA", fontSize: 14, fontWeight: 600, cursor: "pointer",
            }}
          >
            Open Product Calculator
            {specialLumpSum > 0 && <span style={{ marginLeft: 6 }}>({fmt$(specialLumpSum)})</span>}
          </button>
        )}

        <FieldRow label="Notes">
          <textarea
            style={{ ...INPUT, height: "auto", minHeight: 80, padding: "8px 12px", resize: "vertical" }}
            rows={3}
            placeholder="General work order notes…"
            value={groupNotes}
            onChange={(e) => setGroupNotes(e.target.value)}
            onFocus={focusGold as any} onBlur={blurReset as any}
          />
        </FieldRow>
      </div>

      {/* Billing Auto-Calc */}
      {billing && (
        <div style={CARD}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#0E2646" }}>Billing</span>
            <div style={{ flex: 1, height: 1, background: "rgba(26,26,26,0.08)" }} />
            {priceRow && !isSpecial && (
              <span style={{ fontSize: 11, color: "#717182" }}>
                Vet ${priceRow.vet_charge}/hd · SOL ${priceRow.sol_charge}/hd
              </span>
            )}
            {isSpecial && specialLumpSum > 0 && (
              <span style={{ fontSize: 11, color: "#55BAAA" }}>Lump sum applied</span>
            )}
          </div>

          {[
            ["Vet Charge", billing.vetCharge],
            ["Sales Tax", billing.taxCharge],
            [`Admin (${priceRow?.admin_pct ?? 5}%)`, billing.adminCharge],
            ["SOL Charge", billing.solCharge],
          ].map(([label, val]) => (
            <div key={label as string} style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
              <span style={{ fontSize: 13, color: "#717182" }}>{label as string}</span>
              <span style={{ fontSize: 13, fontWeight: 500, color: "#1A1A1A" }}>{fmt$(val as number)}</span>
            </div>
          ))}

          <div style={{ height: 1, background: "rgba(26,26,26,0.08)", margin: "6px 0" }} />

          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: "#0E2646" }}>Total</span>
            <span style={{ fontSize: 16, fontWeight: 700, color: "#55BAAA" }}>{fmt$(billing.totalCharge)}</span>
          </div>
        </div>
      )}

      {/* Status Toggles */}
      <div style={CARD}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: entityType === "buyer" ? 10 : 0 }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: "#1A1A1A" }}>Work Complete</span>
          <ToggleSwitch on={workComplete} onToggle={() => setWorkComplete(!workComplete)} />
        </div>
        {entityType === "buyer" && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <span style={{ fontSize: 14, fontWeight: 600, color: "#1A1A1A" }}>Health Complete</span>
              <div style={{ fontSize: 11, color: "#717182" }}>Interstate buyers only</div>
            </div>
            <ToggleSwitch on={healthComplete} onToggle={() => setHealthComplete(!healthComplete)} />
          </div>
        )}
      </div>

      {/* Notes Thread */}
      <NotesThread woId={woId} showToast={showToast} />

      {/* Label Preview */}
      <LabelPreview
        pen={firstPen}
        customerName={customer?.name || ""}
        buyerNum={buyerNum}
        headCount={hc}
        workType={workType}
        isBuyer={entityType === "buyer"}
        entityType={entityType}
        showToast={showToast}
      />

      {/* Sticky Save Bar */}
      <div style={{
        position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 40,
        background: "#FFFFFF", borderTop: "1px solid #D4D4D0",
        padding: "12px 16px", boxShadow: "0 -2px 12px rgba(0,0,0,0.06)",
        display: "flex", gap: 10,
      }}>
        <button
          type="button"
          onClick={() => navigate(`/sale-barn/${saleDayId}`)}
          style={{
            flex: 0.4, height: 48, borderRadius: 9999,
            border: "1.5px solid #D4D4D0", background: "transparent",
            fontSize: 14, fontWeight: 600, color: "#717182", cursor: "pointer",
          }}
        >
          Cancel
        </button>
        <button
          type="button"
          className="active:scale-[0.97]"
          onClick={handleSave}
          disabled={saving}
          style={{
            flex: 1, height: 48, borderRadius: 9999,
            background: "#F3D12A", border: "none",
            fontSize: 16, fontWeight: 700, color: "#1A1A1A",
            boxShadow: "0 2px 10px rgba(243,209,42,0.35)",
            cursor: saving ? "not-allowed" : "pointer",
            opacity: saving ? 0.6 : 1,
          }}
        >
          {saving ? "Saving…" : isEdit ? "Update Work Order" : "Save Work Order"}
        </button>
      </div>

      {/* Special Charges Bottom Sheet */}
      <SpecialChargesSheet
        open={calcOpen}
        onClose={() => setCalcOpen(false)}
        onApply={(lumpSum) => {
          setSpecialLumpSum(lumpSum);
          setCalcOpen(false);
          showToast("success", `Lump sum $${lumpSum.toFixed(2)} applied`);
        }}
      />
    </div>
  );
};

export default WorkOrderForm;
