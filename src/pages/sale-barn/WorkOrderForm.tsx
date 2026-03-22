import React, { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOperation } from "@/contexts/OperationContext";
import { useSaleBarnPrices } from "@/hooks/sale-barn/useSaleBarnPrices";
import { useChuteSideToast as useToast } from "@/components/ToastContext";
import { focusGold, blurReset } from "@/lib/styles";
import type { SaleDay, WorkOrder, SaleBarnCustomer, SaleBarnAnimal, WorkOrderNote } from "@/types/sale-barn";

// ── Bottom Sheet Shell ──
const BottomSheet: React.FC<{
  open: boolean; onClose: () => void; children: React.ReactNode;
}> = ({ open, onClose, children }) => {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (open) requestAnimationFrame(() => setVisible(true));
    else setVisible(false);
  }, [open]);
  if (!open) return null;
  return (
    <>
      <div onClick={onClose} style={{
        position: "fixed", inset: 0, zIndex: 100, background: "rgba(0,0,0,0.52)",
        opacity: visible ? 1 : 0, transition: "opacity 250ms",
      }} />
      <div className="report-sheet" style={{
        position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 101,
        background: "#FFFFFF", borderRadius: "20px 20px 0 0",
        boxShadow: "0 -4px 30px rgba(0,0,0,0.15)",
        maxHeight: "85vh", display: "flex", flexDirection: "column",
        transform: visible ? "translateY(0)" : "translateY(100%)",
        transition: "transform 300ms ease-out",
      }}>
        <div style={{ display: "flex", justifyContent: "center", padding: "10px 0 6px", flexShrink: 0 }}>
          <div style={{ width: 40, height: 4, borderRadius: 2, background: "#D4D4D0" }} />
        </div>
        {children}
      </div>
    </>
  );
};

// ── Animals Worked Sheet ──
const AnimalsWorkedSheet: React.FC<{
  open: boolean; onClose: () => void; woId: string;
  wo: WorkOrder | null; customer: SaleBarnCustomer | null; saleDayDate: string;
}> = ({ open, onClose, woId, wo, customer, saleDayDate }) => {
  const [search, setSearch] = useState("");

  const { data: animals } = useQuery({
    queryKey: ["wo_sheet_animals", woId],
    enabled: open && !!woId,
    queryFn: async () => {
      const { data } = await (supabase.from("sale_barn_animals") as any)
        .select("*").eq("work_order_id", woId)
        .order("created_at", { ascending: true });
      return (data ?? []) as unknown as SaleBarnAnimal[];
    },
  });

  const list = animals ?? [];
  const filtered = useMemo(() => {
    if (!search.trim()) return list;
    const q = search.toLowerCase();
    return list.filter((a) =>
      a.eid?.toLowerCase().includes(q) || a.back_tag?.toLowerCase().includes(q) || a.tag_number?.toLowerCase().includes(q)
    );
  }, [list, search]);

  const exportCsv = () => {
    const headers = ["#","EID","Back Tag","Tag #","EID 2","Designation","Preg Status","Sex","Breed","Quick Notes","Sorted","Sort Dest Pen","Timestamp"];
    const rows = filtered.map((a, i) => [
      i + 1, a.eid ?? "", a.back_tag ?? "", a.tag_number ?? "", a.eid_2 ?? "",
      a.designation_key ?? "", a.preg_status ?? "", a.sex ?? "", a.breed ?? "",
      (a.quick_notes ?? []).join("; "), a.sorted ? "Yes" : "No",
      a.sort_dest_pen ?? "", new Date(a.created_at).toLocaleString(),
    ]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `animals_worked_${(customer?.name ?? "unknown").replace(/\s+/g, "_")}_${saleDayDate}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  const customerName = customer?.name ?? "Customer";
  const entityType = wo?.entity_type ?? "seller";

  return (
    <BottomSheet open={open} onClose={onClose}>
      <style>{`
        @media print {
          .sheet-no-print { display: none !important; }
          .report-sheet { position: static !important; max-height: none !important; border-radius: 0 !important; box-shadow: none !important; transform: none !important; }
          .sheet-print-header { display: block !important; }
        }
        .sheet-print-header { display: none; }
      `}</style>
      {/* Header */}
      <div className="sheet-no-print" style={{ padding: "0 16px 10px", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 18, fontWeight: 700, color: "#0E2646" }}>Animals Worked</span>
          <span style={{ fontSize: 12, fontWeight: 700, color: "#0E2646", background: "rgba(14,38,70,0.08)", borderRadius: 9999, padding: "3px 10px" }}>
            {filtered.length} head
          </span>
        </div>
        <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: 14, border: "none", background: "rgba(26,26,26,0.06)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 2L12 12M12 2L2 12" stroke="#717182" strokeWidth="1.5" strokeLinecap="round" /></svg>
        </button>
      </div>
      <div className="sheet-print-header" style={{ padding: "0 16px 8px", fontSize: 16, fontWeight: 700 }}>Animals Worked — {customerName} — {saleDayDate}</div>

      <div style={{ overflowY: "auto", flex: 1, padding: "0 16px" }}>
        {/* Customer info bar */}
        <div style={{ background: "#F5F5F0", borderRadius: 8, padding: "8px 12px", marginBottom: 10, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: "#1A1A1A" }}>{customerName}</span>
          <span style={{
            fontSize: 9, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", borderRadius: 9999, padding: "2px 8px",
            background: entityType === "seller" ? "rgba(243,209,42,0.12)" : "rgba(85,186,170,0.15)",
            color: entityType === "seller" ? "#B8860B" : "#55BAAA",
          }}>{entityType}</span>
          {wo?.work_type && <span style={{ fontSize: 12, color: "#717182" }}>{wo.work_type}</span>}
          {wo?.pens && wo.pens.length > 0 && <span style={{ fontSize: 12, color: "#717182" }}>Pen {wo.pens.join(", ")}</span>}
        </div>

        {/* Search */}
        <div className="sheet-no-print" style={{ position: "relative", marginBottom: 10 }}>
          <svg style={{ position: "absolute", left: 10, top: 12 }} width="14" height="14" viewBox="0 0 16 16" fill="none">
            <circle cx="7" cy="7" r="4.5" stroke="#717182" strokeWidth="1.3" /><path d="M10.5 10.5L14 14" stroke="#717182" strokeWidth="1.3" strokeLinecap="round" />
          </svg>
          <input
            style={{ width: "100%", height: 40, borderRadius: 10, border: "1px solid rgba(212,212,208,0.60)", fontSize: 16, padding: "0 12px 0 32px", outline: "none", boxSizing: "border-box" }}
            placeholder="Search EID, back tag, tag #..."
            value={search} onChange={(e) => setSearch(e.target.value)}
            onFocus={focusGold} onBlur={blurReset}
          />
        </div>

        {/* Table header */}
        <div style={{ display: "flex", padding: "6px 12px", gap: 8 }}>
          {["#","TAG / EID","BACK TAG","DESIGNATION","PREG"].map((h, i) => (
            <span key={h} style={{ fontSize: 10, fontWeight: 700, color: "rgba(26,26,26,0.40)", letterSpacing: "0.06em", textTransform: "uppercase",
              width: i === 0 ? 30 : undefined, flex: i > 0 ? 1 : undefined, minWidth: 0 }}>{h}</span>
          ))}
        </div>

        {/* Animal rows */}
        {filtered.map((a, idx) => (
          <div key={a.id} style={{ display: "flex", alignItems: "center", padding: "8px 12px", gap: 8, borderBottom: "1px solid rgba(212,212,208,0.30)" }}>
            <span style={{ width: 30, fontSize: 11, fontWeight: 600, color: "#717182", flexShrink: 0 }}>{idx + 1}</span>
            <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: "#1A1A1A", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {a.tag_number || (a.eid ? a.eid.slice(-6) : "—")}
            </span>
            <span style={{ flex: 1, fontSize: 12, color: "#717182", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.back_tag ?? ""}</span>
            <span style={{ flex: 1, minWidth: 0 }}>
              {a.designation_key && (
                <span style={{ fontSize: 11, fontWeight: 600, borderRadius: 9999, padding: "2px 6px", background: "rgba(14,38,70,0.06)", display: "inline-flex", alignItems: "center", gap: 3 }}>
                  <span style={{ width: 6, height: 6, borderRadius: 3, background: "#0E2646" }} />{a.designation_key}
                </span>
              )}
            </span>
            <span style={{ flex: 1, fontSize: 11, color: "#717182", minWidth: 0 }}>{a.preg_status ?? ""}</span>
            {a.sorted && <span style={{ fontSize: 9, fontWeight: 700, color: "#7B68EE", background: "rgba(123,104,238,0.12)", borderRadius: 9999, padding: "2px 5px" }}>S</span>}
          </div>
        ))}
        {filtered.length === 0 && <div style={{ textAlign: "center", padding: 30, color: "#717182", fontSize: 13 }}>{search ? "No matches" : "No animals"}</div>}
      </div>

      {/* Export bar */}
      <div className="sheet-no-print" style={{ padding: "12px 16px", display: "flex", gap: 8, borderTop: "1px solid rgba(212,212,208,0.30)", flexShrink: 0 }}>
        <button onClick={exportCsv} className="active:scale-[0.97]" style={{
          flex: 1, height: 40, borderRadius: 9999, border: "1.5px solid #0E2646", background: "#FFFFFF",
          color: "#0E2646", fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
        }}>
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none"><path d="M8 2v8M5 7l3 3 3-3M3 12h10" stroke="#0E2646" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
          Export CSV
        </button>
        <button onClick={() => window.print()} className="active:scale-[0.97]" style={{
          flex: 1, height: 40, borderRadius: 9999, border: "1.5px solid #717182", background: "#FFFFFF",
          color: "#717182", fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
        }}>
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none"><path d="M4 6V2h8v4M4 12H2.667A.667.667 0 0 1 2 11.333V8.667A.667.667 0 0 1 2.667 8h10.666a.667.667 0 0 1 .667.667v2.666a.667.667 0 0 1-.667.667H12M4 10h8v4H4v-4z" stroke="#717182" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
          Export PDF
        </button>
      </div>
    </BottomSheet>
  );
};

// ── Health Certificate (CVI) Sheet ──
const CviSheet: React.FC<{
  open: boolean; onClose: () => void; woId: string;
  wo: WorkOrder | null; customer: SaleBarnCustomer | null; saleDayDate: string;
}> = ({ open, onClose, woId, wo, customer, saleDayDate }) => {
  const { data: animals } = useQuery({
    queryKey: ["cvi_sheet_animals", woId],
    enabled: open && !!woId,
    queryFn: async () => {
      const { data } = await (supabase.from("sale_barn_animals") as any)
        .select("*").eq("work_order_id", woId)
        .order("created_at", { ascending: true });
      return (data ?? []) as unknown as SaleBarnAnimal[];
    },
  });

  const list = animals ?? [];
  const customerName = customer?.name ?? "—";

  const exportCsv = () => {
    const headers = ["#","EID","Back Tag","Tag #","Buyer Name","Buyer Address","Buyer Phone","Buyer State","Buyer #"];
    const rows = list.map((a, i) => [
      i + 1, a.eid ?? "", a.back_tag ?? "", a.tag_number ?? "",
      customerName, customer?.address ?? "", customer?.phone ?? "",
      customer?.state ?? "", wo?.buyer_num ?? "",
    ]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cvi_prep_${customerName.replace(/\s+/g, "_")}_${saleDayDate}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  const infoRows: [string, string][] = [
    ["Name", customerName],
    ["Address", customer?.address ?? "—"],
    ["Phone", customer?.phone ?? "—"],
    ["State", customer?.state ?? "—"],
  ];
  if (wo?.entity_type === "buyer" && wo.buyer_num) infoRows.push(["Buyer #", wo.buyer_num]);

  return (
    <BottomSheet open={open} onClose={onClose}>
      <style>{`
        @media print {
          .sheet-no-print { display: none !important; }
          .report-sheet { position: static !important; max-height: none !important; border-radius: 0 !important; box-shadow: none !important; transform: none !important; }
          .sheet-print-header { display: block !important; }
        }
        .sheet-print-header { display: none; }
      `}</style>
      <div className="sheet-no-print" style={{ padding: "0 16px 10px", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
        <span style={{ fontSize: 18, fontWeight: 700, color: "#0E2646" }}>Health Certificate</span>
        <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: 14, border: "none", background: "rgba(26,26,26,0.06)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 2L12 12M12 2L2 12" stroke="#717182" strokeWidth="1.5" strokeLinecap="round" /></svg>
        </button>
      </div>
      <div className="sheet-print-header" style={{ padding: "0 16px 8px", fontSize: 16, fontWeight: 700 }}>CVI Prep Sheet — {customerName} — {saleDayDate}</div>

      <div style={{ overflowY: "auto", flex: 1, padding: "0 16px" }}>
        {/* Buyer Information */}
        <div style={{ background: "#FFFFFF", borderRadius: 10, border: "1px solid rgba(212,212,208,0.60)", padding: "12px 14px", marginBottom: 12 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(26,26,26,0.40)", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 8 }}>BUYER INFORMATION</div>
          {infoRows.map(([label, val]) => (
            <div key={label} style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
              <span style={{ fontSize: 13, fontWeight: 500, color: "#717182" }}>{label}</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: "#1A1A1A" }}>{val}</span>
            </div>
          ))}
        </div>

        {/* Animal Summary */}
        <div style={{ background: "#FFFFFF", borderRadius: 10, border: "1px solid rgba(212,212,208,0.60)", padding: "12px 14px", marginBottom: 12 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(26,26,26,0.40)", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 8 }}>ANIMAL SUMMARY</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#0E2646", marginBottom: 4 }}>{list.length} head</div>
          <div style={{ fontSize: 13, color: "#717182" }}>{wo?.animal_type ?? "—"} · {wo?.work_type ?? "—"}</div>
        </div>

        {/* Animal Identification */}
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(26,26,26,0.40)", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 6, padding: "0 2px" }}>ANIMAL IDENTIFICATION</div>
          <div style={{ display: "flex", padding: "6px 12px", gap: 8 }}>
            {["#","EID","BACK TAG","TAG #"].map((h, i) => (
              <span key={h} style={{ fontSize: 10, fontWeight: 700, color: "rgba(26,26,26,0.40)", letterSpacing: "0.06em",
                width: i === 0 ? 30 : undefined, flex: i > 0 ? 1 : undefined }}>{h}</span>
            ))}
          </div>
          {list.map((a, idx) => (
            <div key={a.id} style={{
              display: "flex", alignItems: "center", padding: "6px 12px", gap: 8,
              background: idx % 2 === 1 ? "#F5F5F0" : "#FFFFFF",
            }}>
              <span style={{ width: 30, fontSize: 11, fontWeight: 600, color: "#717182", flexShrink: 0 }}>{idx + 1}</span>
              <span style={{ flex: 1, fontSize: 12, fontWeight: 500, color: "#1A1A1A", fontFamily: "monospace", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.eid ?? "—"}</span>
              <span style={{ flex: 1, fontSize: 12, color: "#717182", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.back_tag ?? "—"}</span>
              <span style={{ flex: 1, fontSize: 12, color: "#717182", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.tag_number ?? "—"}</span>
            </div>
          ))}
          {list.length === 0 && <div style={{ textAlign: "center", padding: 30, color: "#717182", fontSize: 13 }}>No animals</div>}
        </div>
      </div>

      {/* Export bar */}
      <div className="sheet-no-print" style={{ padding: "12px 16px", display: "flex", gap: 8, borderTop: "1px solid rgba(212,212,208,0.30)", flexShrink: 0 }}>
        <button onClick={exportCsv} className="active:scale-[0.97]" style={{
          flex: 1, height: 40, borderRadius: 9999, border: "1.5px solid #0E2646", background: "#FFFFFF",
          color: "#0E2646", fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
        }}>
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none"><path d="M8 2v8M5 7l3 3 3-3M3 12h10" stroke="#0E2646" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
          Export CSV
        </button>
        <button onClick={() => window.print()} className="active:scale-[0.97]" style={{
          flex: 1, height: 40, borderRadius: 9999, border: "1.5px solid #717182", background: "#FFFFFF",
          color: "#717182", fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
        }}>
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none"><path d="M4 6V2h8v4M4 12H2.667A.667.667 0 0 1 2 11.333V8.667A.667.667 0 0 1 2.667 8h10.666a.667.667 0 0 1 .667.667v2.666a.667.667 0 0 1-.667.667H12M4 10h8v4H4v-4z" stroke="#717182" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
          Print Report
        </button>
      </div>
    </BottomSheet>
  );
};

// ── Report Buttons ──
const ReportButtons: React.FC<{
  woId: string; wo: WorkOrder | null; customer: SaleBarnCustomer | null; saleDayDate: string;
}> = ({ woId, wo, customer, saleDayDate }) => {
  const [animalsOpen, setAnimalsOpen] = useState(false);
  const [cviOpen, setCviOpen] = useState(false);

  const { data: animalCount } = useQuery({
    queryKey: ["wo_animal_count", woId],
    queryFn: async () => {
      const { count, error } = await (supabase.from("sale_barn_animals") as any)
        .select("id", { count: "exact", head: true })
        .eq("work_order_id", woId);
      if (error) return 0;
      return count ?? 0;
    },
  });

  if (!animalCount || animalCount < 1) return null;

  return (
    <>
      <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
        <button
          type="button" className="active:scale-[0.98]"
          onClick={() => setAnimalsOpen(true)}
          style={{
            flex: 1, height: 44, borderRadius: 10,
            background: "rgba(14,38,70,0.04)", border: "1px solid rgba(212,212,208,0.60)",
            cursor: "pointer", display: "flex", alignItems: "center", gap: 8, padding: "0 12px",
          }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2 4h12M2 8h12M2 12h8" stroke="#0E2646" strokeWidth="1.5" strokeLinecap="round" /></svg>
          <div style={{ textAlign: "left" }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#0E2646" }}>Animals Worked</div>
            <div style={{ fontSize: 11, fontWeight: 400, color: "#717182" }}>{animalCount} head</div>
          </div>
        </button>
        <button
          type="button" className="active:scale-[0.98]"
          onClick={() => setCviOpen(true)}
          style={{
            flex: 1, height: 44, borderRadius: 10,
            background: "rgba(85,186,170,0.04)", border: "1px solid rgba(85,186,170,0.30)",
            cursor: "pointer", display: "flex", alignItems: "center", gap: 8, padding: "0 12px",
          }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M9 2H4a1 1 0 00-1 1v10a1 1 0 001 1h8a1 1 0 001-1V6L9 2z" stroke="#55BAAA" strokeWidth="1.2" strokeLinejoin="round" />
            <path d="M9 2v4h4" stroke="#55BAAA" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <div style={{ textAlign: "left" }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#55BAAA" }}>Health Cert</div>
            <div style={{ fontSize: 11, fontWeight: 400, color: "#717182" }}>CVI Report</div>
          </div>
        </button>
      </div>
      <AnimalsWorkedSheet open={animalsOpen} onClose={() => setAnimalsOpen(false)} woId={woId} wo={wo} customer={customer} saleDayDate={saleDayDate} />
      <CviSheet open={cviOpen} onClose={() => setCviOpen(false)} woId={woId} wo={wo} customer={customer} saleDayDate={saleDayDate} />
    </>
  );
};

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
const FlagSvg: React.FC<{ size?: number; fill?: string; stroke?: string }> = ({ size = 14, fill = "none", stroke = "#717182" }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
    <line x1="2" y1="2" x2="2" y2="14" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" />
    <path d="M2 2.5H12L10 5.5L12 8.5H2V2.5Z" fill={fill} stroke={stroke} strokeWidth="1.2" strokeLinejoin="round" />
  </svg>
);

const NotesThread: React.FC<{ woId: string | undefined; showToast: (v: string, m: string) => void }> = ({ woId, showToast }) => {
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const [flagged, setFlagged] = useState(false);
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
      is_flagged: flagged,
    });
    setSubmitting(false);
    if (error) { showToast("error", error.message); return; }
    setText("");
    setFlagged(false);
    qc.invalidateQueries({ queryKey: ["work_order_notes", woId] });
    qc.invalidateQueries({ queryKey: ["flagged_notes"] });
  }, [text, woId, flagged, qc, showToast]);

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
              {n.is_flagged && <FlagSvg size={12} fill="#F3D12A" stroke="#B8860B" />}
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
            type="button"
            onClick={() => setFlagged(!flagged)}
            style={{
              width: 36, height: 36, borderRadius: 8, flexShrink: 0,
              border: flagged ? "1px solid #F3D12A" : "1px solid #D4D4D0",
              background: flagged ? "rgba(243,209,42,0.15)" : "transparent",
              cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            <FlagSvg size={16} fill={flagged ? "#F3D12A" : "none"} stroke={flagged ? "#F3D12A" : "#717182"} />
          </button>
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

// ── Assign Animals Section (buyer only) ──
const AssignAnimalsSection: React.FC<{
  woId: string; saleDayId: string; buyerName: string;
  navigate: (path: string) => void;
}> = ({ woId, saleDayId, buyerName, navigate }) => {
  const [showAll, setShowAll] = useState(false);

  const { data: assignedAnimals } = useQuery({
    queryKey: ["assigned_animals", woId],
    queryFn: async () => {
      const { data } = await (supabase.from("sale_barn_animals") as any)
        .select("id,eid,tag_number,designation_key,work_order_id")
        .eq("buyer_work_order_id", woId)
        .order("created_at", { ascending: true });
      return (data ?? []) as { id: string; eid: string; tag_number: string | null; designation_key: string | null; work_order_id: string }[];
    },
  });

  // Fetch seller names for assigned animals
  const sellerWoIds = useMemo(() => [...new Set((assignedAnimals ?? []).map(a => a.work_order_id))], [assignedAnimals]);
  const { data: sellerWos } = useQuery({
    queryKey: ["assigned_seller_wos", sellerWoIds],
    enabled: sellerWoIds.length > 0,
    queryFn: async () => {
      const { data: wos } = await (supabase.from("work_orders") as any).select("id,customer_id").in("id", sellerWoIds);
      if (!wos?.length) return {};
      const custIds = wos.map((w: any) => w.customer_id).filter(Boolean);
      const { data: custs } = await (supabase.from("sale_barn_customers") as any).select("id,name").in("id", custIds);
      const custMap: Record<string, string> = {};
      (custs ?? []).forEach((c: any) => { custMap[c.id] = c.name; });
      const woMap: Record<string, string> = {};
      wos.forEach((w: any) => { woMap[w.id] = custMap[w.customer_id] ?? "Unknown"; });
      return woMap;
    },
  });

  const count = assignedAnimals?.length ?? 0;
  const sellerNameMap = sellerWos ?? {};

  return (
    <>
      <button
        type="button"
        className="active:scale-[0.98]"
        onClick={() => navigate(`/sale-barn/${saleDayId}/work-order/${woId}/assign`)}
        style={{
          width: "100%", height: 44, borderRadius: 10, marginBottom: 10,
          background: "rgba(85,186,170,0.06)", border: "1.5px solid #55BAAA",
          color: "#55BAAA", fontSize: 14, fontWeight: 600, cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
        }}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M8 2v5M5 4l3 3 3-3M3 9h10v4H3z" stroke="#55BAAA" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Assign Animals from Sellers
        {count > 0 && (
          <span style={{
            fontSize: 11, fontWeight: 700, borderRadius: 9999, padding: "2px 8px",
            background: "rgba(85,186,170,0.15)", color: "#55BAAA", marginLeft: 4,
          }}>{count} assigned</span>
        )}
      </button>

      {count > 0 && (
        <div style={{ marginBottom: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: "#0E2646" }}>Assigned animals</span>
            <span style={{
              fontSize: 11, fontWeight: 700, borderRadius: 9999, padding: "1px 7px",
              background: "rgba(85,186,170,0.12)", color: "#55BAAA",
            }}>{count}</span>
          </div>
          {(showAll ? assignedAnimals! : assignedAnimals!.slice(0, 3)).map(a => (
            <div key={a.id} style={{
              padding: "6px 12px", background: "#F5F5F0", borderRadius: 8, marginBottom: 3,
              display: "flex", alignItems: "center", gap: 8,
            }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: "#1A1A1A" }}>{a.tag_number || (a.eid ? a.eid.slice(-6) : "—")}</span>
              {a.designation_key && <span style={{ fontSize: 10, color: "#717182" }}>{a.designation_key}</span>}
              <span style={{ fontSize: 12, color: "#717182", marginLeft: "auto" }}>{sellerNameMap[a.work_order_id] ?? ""}</span>
            </div>
          ))}
          {count > 3 && !showAll && (
            <button onClick={() => setShowAll(true)} style={{
              background: "none", border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600, color: "#55BAAA", padding: "4px 0",
            }}>View all {count} →</button>
          )}
        </div>
      )}
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
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [woDeleting, setWoDeleting] = useState(false);

  const handleDeleteWo = async () => {
    if (!woId) return;
    setWoDeleting(true);
    await (supabase.from("sale_barn_animals") as any).delete().eq("work_order_id", woId);
    await (supabase.from("work_order_notes") as any).delete().eq("work_order_id", woId);
    await (supabase.from("work_orders") as any).delete().eq("id", woId);
    queryClient.invalidateQueries({ queryKey: ["work_orders"] });
    setWoDeleting(false);
    showToast("success", "Work order deleted");
    try { navigator.vibrate(50); } catch {}
    navigate(`/sale-barn/${saleDayId}`);
  };

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

      {/* Assign Animals Button (buyer edit only) */}
      {isEdit && woId && entityType === "buyer" && (
        <AssignAnimalsSection woId={woId} saleDayId={saleDayId!} buyerName={customer?.name ?? "Buyer"} navigate={navigate} />
      )}

      {/* Report Buttons */}
      {isEdit && woId && <ReportButtons woId={woId} wo={existingWo ?? null} customer={customer} saleDayDate={saleDay?.date ?? ""} />}

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
        boxShadow: "0 -2px 12px rgba(0,0,0,0.06)",
      }}>
      <div style={{
        maxWidth: 600, margin: "0 auto",
        padding: "12px 16px",
        display: "flex", flexDirection: "column", gap: 8,
      }}>
        <div style={{ display: "flex", gap: 10 }}>
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
        {isEdit && woId && (
          workComplete ? (
            <div
              style={{
                width: "100%", height: 48, borderRadius: 9999,
                background: "rgba(85,186,170,0.12)", border: "1px solid rgba(85,186,170,0.30)",
                fontSize: 16, fontWeight: 700, color: "#55BAAA",
                pointerEvents: "none",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              }}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M3 8.5L6.5 12L13 4" stroke="#55BAAA" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Work Complete
            </div>
          ) : (
            <button
              type="button"
              className="active:scale-[0.97]"
              onClick={() => navigate(`/sale-barn/${saleDayId}/work-order/${woId}/chute`)}
              style={{
                width: "100%", height: 48, borderRadius: 9999,
                background: "#0E2646", border: "none",
                fontSize: 16, fontWeight: 700, color: "#FFFFFF",
                boxShadow: "0 2px 10px rgba(14,38,70,0.25)",
                cursor: "pointer", display: "flex", alignItems: "center",
                justifyContent: "center", gap: 8,
              }}
            >
              Start Working
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M3 8H13M10 5L13 8L10 11" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          )
        )}
        {/* Delete Work Order (edit mode) */}
        {isEdit && woId && !showDeleteConfirm && (
          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              width: "100%", background: "none", border: "none", cursor: "pointer",
              padding: 12, fontSize: 13, fontWeight: 600, color: "#D4183D",
            }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M2 4h10M5 4V2.5A.5.5 0 0 1 5.5 2h3a.5.5 0 0 1 .5.5V4M11 4v7.5a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V4" stroke="#D4183D" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Delete Work Order
          </button>
        )}
        {isEdit && woId && showDeleteConfirm && (
          <div style={{
            borderRadius: 12, border: "2px solid #D4183D", background: "rgba(212,24,61,0.03)",
            padding: "14px 16px", marginTop: 4,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M10 2L18.66 17H1.34L10 2z" stroke="#D4183D" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M10 8v4M10 14h.01" stroke="#D4183D" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              <span style={{ fontSize: 15, fontWeight: 700, color: "#D4183D" }}>Delete this work order?</span>
            </div>
            <div style={{ fontSize: 12, color: "#717182", lineHeight: 1.4, marginTop: 8 }}>
              This will permanently delete the work order and all associated animal records. This cannot be undone.
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                style={{
                  flex: 1, height: 40, borderRadius: 9999, border: "1px solid #D4D4D0",
                  background: "transparent", fontSize: 13, fontWeight: 600, color: "#717182", cursor: "pointer",
                }}
              >Cancel</button>
              <button
                type="button"
                onClick={handleDeleteWo}
                disabled={woDeleting}
                className="active:scale-[0.97]"
                style={{
                  flex: 1, height: 40, borderRadius: 9999, border: "none",
                  background: "#D4183D", fontSize: 13, fontWeight: 700, color: "#FFFFFF",
                  cursor: woDeleting ? "not-allowed" : "pointer", opacity: woDeleting ? 0.6 : 1,
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                }}
              >
                {woDeleting && <span style={{ width: 14, height: 14, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#FFF", borderRadius: "50%", animation: "spin 0.6s linear infinite", display: "inline-block" }} />}
                Delete
              </button>
            </div>
          </div>
        )}
      </div>
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
