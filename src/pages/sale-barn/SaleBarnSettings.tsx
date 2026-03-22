import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOperation } from "@/contexts/OperationContext";
import { useSaleBarnPrices } from "@/hooks/sale-barn/useSaleBarnPrices";
import { useDesignationKeys } from "@/hooks/sale-barn/useDesignationKeys";
import { useChuteSideToast } from "@/components/ToastContext";
import { focusGold, blurReset } from "@/lib/styles";
import type { SaleBarnPrice, DesignationKey } from "@/types/sale-barn";

/* ── shared tab wrapper ── */
const SaleBarnSettings: React.FC<{ activeTab: "prices" | "designations" }> = ({ activeTab: initialTab }) => {
  const [tab, setTab] = useState<"prices" | "designations">(initialTab);

  return (
    <div>
      {/* Tab bar */}
      <div style={{ display: "flex", background: "#FFFFFF", borderBottom: "1px solid #D4D4D0" }}>
        {(["prices", "designations"] as const).map((t) => {
          const active = tab === t;
          return (
            <button key={t} onClick={() => setTab(t)} style={{
              flex: 1, padding: "12px 8px", fontSize: 14, border: "none", background: "none", cursor: "pointer",
              fontWeight: active ? 700 : 500, color: active ? "#0E2646" : "#717182",
              borderBottom: active ? "2.5px solid #F3D12A" : "2.5px solid transparent",
            }}>{t === "prices" ? "Prices" : "Designation"}</button>
          );
        })}
      </div>
      <div style={{ padding: "12px 16px 24px" }}>
        {tab === "prices" ? <PriceScheduleTab /> : <DesignationKeyTab />}
      </div>
    </div>
  );
};

/* ══════════════════════════════════════════════
   PRICE SCHEDULE TAB
   ══════════════════════════════════════════════ */
const PriceScheduleTab: React.FC = () => {
  const { operationName } = useOperation();
  const { showToast } = useChuteSideToast();
  const qc = useQueryClient();
  const { data } = useSaleBarnPrices();
  const prices = data?.data ?? [];

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [editSol, setEditSol] = useState("");
  const [editVet, setEditVet] = useState("");
  const [saving, setSaving] = useState(false);

  const calcPerHead = (vet: number, sol: number, taxRate: number, adminPct: number) => {
    const vetTotal = vet + (vet * taxRate / 100);
    const admin = vetTotal * adminPct / 100;
    return vetTotal + admin + sol;
  };

  const toggleRow = (id: string) => {
    if (expandedId === id) { setExpandedId(null); setEditId(null); }
    else { setExpandedId(id); setEditId(null); }
  };

  const startEdit = (p: SaleBarnPrice) => {
    setEditId(p.id);
    setEditSol(String(p.sol_charge));
    setEditVet(String(p.vet_charge));
  };

  const cancelEdit = () => setEditId(null);

  const handleSave = async () => {
    if (!editId) return;
    setSaving(true);
    const { error } = await (supabase.from("sale_barn_prices") as any)
      .update({ sol_charge: parseFloat(editSol) || 0, vet_charge: parseFloat(editVet) || 0 })
      .eq("id", editId);
    setSaving(false);
    if (error) { showToast("error", error.message); return; }
    showToast("success", "Price schedule saved");
    setEditId(null);
    setExpandedId(null);
    qc.invalidateQueries({ queryKey: ["sale_barn_prices"] });
  };

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <span style={{ fontSize: 20, fontWeight: 800, color: "#0E2646", letterSpacing: "-0.02em" }}>Price Schedule</span>
        <span style={{ fontSize: 12, fontWeight: 600, color: "#717182" }}>{operationName}</span>
      </div>

      <div style={{ borderRadius: 10, overflow: "hidden", border: "1px solid rgba(212,212,208,0.30)" }}>
        {prices.map((p, i) => {
          const isExpanded = expandedId === p.id;
          const isEditing = editId === p.id;
          const sol = isEditing ? parseFloat(editSol) || 0 : p.sol_charge;
          const vet = isEditing ? parseFloat(editVet) || 0 : p.vet_charge;
          const perHead = p.is_special ? null : calcPerHead(vet, sol, p.tax_rate, p.admin_pct);
          const rowBg = i % 2 === 0 ? "#FFFFFF" : "#F5F5F0";
          const detailBg = rowBg === "#FFFFFF" ? "#F5F5F0" : "#FFFFFF";

          return (
            <div key={p.id}>
              <button
                onClick={() => toggleRow(p.id)}
                style={{
                  width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "12px 14px", background: rowBg, border: "none", cursor: "pointer",
                  borderBottom: isExpanded ? "none" : "1px solid rgba(212,212,208,0.30)",
                }}
              >
                <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: "#1A1A1A" }}>{p.work_type}</span>
                  {p.is_special && (
                    <span style={{ fontSize: 9, fontWeight: 700, color: "#55BAAA", background: "rgba(85,186,170,0.12)", borderRadius: 9999, padding: "2px 6px" }}>CALC</span>
                  )}
                </span>
                <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 15, fontWeight: 700, color: perHead != null ? "#55BAAA" : "#717182" }}>
                    {perHead != null ? `$${perHead.toFixed(2)}` : "Varies"}
                  </span>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 200ms ease" }}>
                    <path d="M4 6l4 4 4-4" stroke="#717182" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
              </button>

              {isExpanded && (
                <div style={{ padding: "10px 14px 12px", background: detailBg, borderBottom: "1px solid rgba(212,212,208,0.30)" }}>
                  {([
                    { label: "SOL Charge", value: sol, editable: true, field: "sol" as const },
                    { label: "Vet Charge", value: vet, editable: true, field: "vet" as const },
                    { label: "Admin", value: p.admin_pct, editable: false, suffix: "%" },
                    { label: "Tax", value: p.tax_rate, editable: false, suffix: "%" },
                  ] as const).map((line) => (
                    <div key={line.label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "5px 0" }}>
                      <span style={{ fontSize: 13, fontWeight: 400, color: "#717182" }}>{line.label}</span>
                      {isEditing && line.editable ? (
                        <input
                          type="number"
                          style={{
                            width: 90, height: 36, borderRadius: 8, border: "1px solid #D4D4D0",
                            fontSize: 16, textAlign: "right", padding: "0 8px", outline: "none",
                            boxSizing: "border-box", fontFamily: "'Inter', sans-serif",
                          }}
                          value={line.field === "sol" ? editSol : editVet}
                          onChange={(e) => line.field === "sol" ? setEditSol(e.target.value) : setEditVet(e.target.value)}
                          onFocus={focusGold} onBlur={blurReset}
                        />
                      ) : (
                        <span style={{ fontSize: 13, fontWeight: 400, color: "#1A1A1A" }}>
                          {line.suffix ? `${line.value}${line.suffix}` : `$${Number(line.value).toFixed(2)}`}
                        </span>
                      )}
                    </div>
                  ))}

                  <div style={{ marginTop: 8 }}>
                    {isEditing ? (
                      <div style={{ display: "flex", gap: 8 }}>
                        <button onClick={cancelEdit} style={{
                          flex: 0.4, height: 32, borderRadius: 9999, border: "1px solid #D4D4D0",
                          background: "transparent", fontSize: 13, fontWeight: 600, color: "#717182", cursor: "pointer",
                        }}>Cancel</button>
                        <button onClick={handleSave} disabled={saving} className="active:scale-[0.97]" style={{
                          flex: 1, height: 32, borderRadius: 9999, border: "none",
                          background: "#F3D12A", fontSize: 13, fontWeight: 700, color: "#1A1A1A",
                          cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.6 : 1,
                        }}>{saving ? "Saving…" : "Save"}</button>
                      </div>
                    ) : (
                      <button onClick={() => startEdit(p)} style={{
                        background: "none", border: "none", fontSize: 13, fontWeight: 600,
                        color: "#55BAAA", cursor: "pointer", padding: 0,
                      }}>Edit</button>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div style={{ textAlign: "center", fontSize: 11, color: "#717182", marginTop: 16 }}>
        Tap any row to edit · Admin and Tax rates are global
      </div>
    </>
  );
};

/* ══════════════════════════════════════════════
   DESIGNATION KEY TAB
   ══════════════════════════════════════════════ */
const LIGHT_COLORS = ["#F3D12A", "#FFFFFF", "#FFFF00", "#FFF200"];
const abbrev = (label: string) => label.slice(0, 3).toUpperCase();

const DesignationKeyTab: React.FC = () => {
  const { operationName } = useOperation();
  const { showToast } = useChuteSideToast();
  const qc = useQueryClient();
  const { data } = useDesignationKeys();
  const keys = data?.data ?? [];

  const [editId, setEditId] = useState<string | null>(null);
  const [editDesc, setEditDesc] = useState("");
  const [saving, setSaving] = useState(false);

  const startEdit = (dk: DesignationKey) => { setEditId(dk.id); setEditDesc(dk.description ?? ""); };
  const cancelEdit = () => setEditId(null);

  const handleSave = async () => {
    if (!editId) return;
    setSaving(true);
    const { error } = await (supabase.from("designation_keys") as any)
      .update({ description: editDesc.trim() || null })
      .eq("id", editId);
    setSaving(false);
    if (error) { showToast("error", error.message); return; }
    showToast("success", "Designation updated");
    setEditId(null);
    qc.invalidateQueries({ queryKey: ["designation_keys"] });
  };

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
        <span style={{ fontSize: 20, fontWeight: 800, color: "#0E2646", letterSpacing: "-0.02em" }}>Designation Key</span>
        <span style={{ fontSize: 12, fontWeight: 600, color: "#717182" }}>{operationName}</span>
      </div>
      <div style={{ fontSize: 13, color: "#717182", marginBottom: 12 }}>
        Maps tag color to age bracket. Configurable per sale barn.
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {keys.map((dk) => {
          const isEditing = editId === dk.id;
          const isLight = LIGHT_COLORS.includes(dk.hex_color.toUpperCase());
          const isWhite = dk.hex_color.toUpperCase() === "#FFFFFF";

          return (
            <div key={dk.id} style={{
              background: "#FFFFFF", borderRadius: 10, border: "1px solid rgba(212,212,208,0.60)",
              padding: "12px 14px", display: "flex", alignItems: "center", gap: 12,
            }}>
              {/* Swatch */}
              <div style={{
                width: 36, height: 36, borderRadius: 8, background: dk.hex_color, flexShrink: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
                border: isWhite ? "2px solid #D4D4D0" : "none",
              }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: isLight ? "#1A1A1A" : "#FFFFFF" }}>
                  {abbrev(dk.label)}
                </span>
              </div>

              {/* Center */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 15, fontWeight: 600, color: "#1A1A1A" }}>{dk.label}</div>
                {isEditing ? (
                  <input
                    autoFocus
                    style={{
                      width: "100%", height: 30, borderRadius: 6, border: "1px solid #D4D4D0",
                      fontSize: 13, padding: "0 8px", outline: "none", marginTop: 4, boxSizing: "border-box",
                    }}
                    value={editDesc}
                    onChange={(e) => setEditDesc(e.target.value)}
                    onFocus={focusGold} onBlur={blurReset}
                    onKeyDown={(e) => { if (e.key === "Enter") handleSave(); if (e.key === "Escape") cancelEdit(); }}
                  />
                ) : (
                  <div style={{ fontSize: 13, fontWeight: 400, color: "#717182", marginTop: 1 }}>
                    {dk.description || "—"}
                  </div>
                )}
              </div>

              {/* Right */}
              {isEditing ? (
                <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                  <button onClick={cancelEdit} style={{
                    height: 30, borderRadius: 9999, border: "1px solid #D4D4D0", background: "transparent",
                    fontSize: 11, fontWeight: 600, color: "#717182", padding: "0 10px", cursor: "pointer",
                  }}>Cancel</button>
                  <button onClick={handleSave} disabled={saving} style={{
                    height: 30, borderRadius: 9999, border: "none", background: "#0E2646",
                    fontSize: 11, fontWeight: 700, color: "#FFFFFF", padding: "0 12px",
                    cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.6 : 1,
                  }}>{saving ? "…" : "Save"}</button>
                </div>
              ) : (
                <button onClick={() => startEdit(dk)} style={{
                  width: 32, height: 32, borderRadius: 8, background: "rgba(14,38,70,0.06)",
                  border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M11.5 2.5l2 2L5 13H3v-2l8.5-8.5z" stroke="#0E2646" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Notched tag info */}
      <div style={{
        background: "#FFFFFF", borderRadius: 10, border: "1px solid rgba(212,212,208,0.60)",
        padding: "12px 14px", marginTop: 14, display: "flex", gap: 10, alignItems: "flex-start",
      }}>
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" style={{ flexShrink: 0, marginTop: 1 }}>
          <circle cx="10" cy="10" r="8" stroke="#55BAAA" strokeWidth="1.5" />
          <path d="M10 9v4" stroke="#55BAAA" strokeWidth="1.5" strokeLinecap="round" />
          <circle cx="10" cy="7" r="0.75" fill="#55BAAA" />
        </svg>
        <div style={{ fontSize: 13, color: "#1A1A1A", lineHeight: 1.5 }}>
          <strong>Notched tag</strong> = non-brucellosis vaccinated. If the ear tag has a notch cut out, that animal has not been Bangs vaccinated.
        </div>
      </div>

      <div style={{ textAlign: "center", fontSize: 11, color: "#717182", marginTop: 16 }}>
        SOL uses tag color = age bracket · Other barns may use numbers or letters
      </div>
    </>
  );
};

export default SaleBarnSettings;
