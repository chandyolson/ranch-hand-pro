import React, { useState, useMemo, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOperation } from "@/contexts/OperationContext";
import { useSaleBarnPrices } from "@/hooks/sale-barn/useSaleBarnPrices";
import { useChuteSideToast as useToast } from "@/components/ToastContext";
import { focusGold, blurReset } from "@/lib/styles";
import type { SaleDay, WorkOrder, SaleBarnCustomer, SaleBarnPrice } from "@/types/sale-barn";

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

// ── Main Form ──
const WorkOrderForm: React.FC = () => {
  const { id: saleDayId, woId } = useParams<{ id: string; woId: string }>();
  const navigate = useNavigate();
  const { operationId } = useOperation();
  const { showToast } = useToast();
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
    // Try to fetch customer
    if (existingWo.customer_id) {
      (supabase.from("sale_barn_customers") as any)
        .select("*").eq("id", existingWo.customer_id).single()
        .then(({ data }: any) => { if (data) setCustomer(data as SaleBarnCustomer); });
    }
  }, [existingWo]);

  // Price lookup & billing calc
  const priceRow = useMemo(() => {
    if (!workType) return null;
    return prices.find((p) => p.work_type === workType) ?? null;
  }, [workType, prices]);

  const hc = parseInt(headCount) || 0;

  const billing = useMemo(() => {
    if (!priceRow || hc <= 0) return null;
    const vetCharge = priceRow.vet_charge * hc;
    const taxCharge = vetCharge * (priceRow.tax_rate / 100);
    const vetTotal = vetCharge + taxCharge;
    const adminCharge = vetTotal * (priceRow.admin_pct / 100);
    const solCharge = priceRow.sol_charge * hc;
    const totalCharge = vetTotal + adminCharge + solCharge;
    return { vetCharge, taxCharge, vetTotal, adminCharge, solCharge, totalCharge };
  }, [priceRow, hc]);

  const isSpecial = priceRow?.is_special === true;

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
      special_lump_sum: 0,
      work_complete: false,
      health_complete: false,
      group_notes: null,
    };

    let error: any;
    if (isEdit && woId) {
      ({ error } = await (supabase.from("work_orders") as any).update(row).eq("id", woId));
    } else {
      ({ error } = await (supabase.from("work_orders") as any).insert(row));
    }

    setSaving(false);
    if (error) {
      showToast("error", error.message);
    } else {
      showToast("success", isEdit ? "Work order updated" : "Work order created");
      navigate(`/sale-barn/${saleDayId}`);
    }
  };

  const fmt$ = (n: number) => "$" + n.toFixed(2);

  return (
    <div style={{ paddingBottom: 90 }}>
      {/* Customer Section */}
      <div style={CARD}>
        <FieldRow label="Customer" req>
          <CustomerSearch operationId={operationId} selected={customer} onSelect={setCustomer} />
        </FieldRow>

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
            onClick={() => showToast("info", "Product calculator coming in next prompt")}
            style={{
              width: "100%", height: 40, borderRadius: 10, marginTop: 4,
              border: "1.5px solid #55BAAA", background: "rgba(85,186,170,0.06)",
              color: "#55BAAA", fontSize: 14, fontWeight: 600, cursor: "pointer",
            }}
          >
            Open Product Calculator
          </button>
        )}
      </div>

      {/* Billing Auto-Calc */}
      {billing && (
        <div style={CARD}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#0E2646" }}>Billing</span>
            <div style={{ flex: 1, height: 1, background: "rgba(26,26,26,0.08)" }} />
            {priceRow && (
              <span style={{ fontSize: 11, color: "#717182" }}>
                Vet ${priceRow.vet_charge}/hd · SOL ${priceRow.sol_charge}/hd
              </span>
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
    </div>
  );
};

export default WorkOrderForm;
