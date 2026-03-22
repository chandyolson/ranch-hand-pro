import React, { useState, useMemo, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useDesignationKeys } from "@/hooks/sale-barn/useDesignationKeys";
import { useChuteSideToast as useToast } from "@/components/ToastContext";
import { focusGold, blurReset } from "@/lib/styles";
import type { WorkOrder, SaleBarnAnimal, DesignationKey } from "@/types/sale-barn";

/* ── constants ── */
const CARD: React.CSSProperties = {
  background: "#FFFFFF", borderRadius: 12,
  border: "1px solid rgba(212,212,208,0.60)",
  padding: "12px 14px", marginBottom: 10,
};
const INPUT: React.CSSProperties = {
  flex: 1, minWidth: 0, height: 36, borderRadius: 8,
  border: "1px solid #D4D4D0", fontSize: 16, padding: "0 12px",
  outline: "none", backgroundColor: "#FFFFFF", boxSizing: "border-box",
};

const PREG_OPTIONS = ["Pregnant", "Open", "Out", "Not Checked"];
const SEX_OPTIONS = ["Bull", "Heifer", "Steer"];
const RED_NOTES = ["Horns", "Lame", "Lump Jaw", "Bad Eye", "Cancer Eye"];
const GOLD_NOTES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const TEAL_NOTES = ["Thin", "Old", "Broken Mouth"];
const BREED_NOTES = ["Hereford", "Red", "Baldy", "Dairy", "Roping", "Charolais"];

type NoteColor = "#9B2335" | "#B8860B" | "#55BAAA" | "#0E2646";
const NOTE_GROUPS: { notes: string[]; color: NoteColor }[] = [
  { notes: RED_NOTES, color: "#9B2335" },
  { notes: GOLD_NOTES, color: "#B8860B" },
  { notes: TEAL_NOTES, color: "#55BAAA" },
  { notes: BREED_NOTES, color: "#0E2646" },
];
const COLOR_RGB: Record<NoteColor, string> = {
  "#9B2335": "155,35,53",
  "#B8860B": "184,134,11",
  "#55BAAA": "85,186,170",
  "#0E2646": "14,38,70",
};
const noteColor = (n: string): NoteColor => {
  if (RED_NOTES.includes(n)) return "#9B2335";
  if (GOLD_NOTES.includes(n)) return "#B8860B";
  if (BREED_NOTES.includes(n)) return "#0E2646";
  return "#55BAAA";
};
const pregColor = (s: string | null) => {
  if (s === "Pregnant") return "#55BAAA";
  if (s === "Open") return "#B8860B";
  if (s === "Out") return "#D4183D";
  return "#717182";
};

type BatchField = "preg" | "designation" | "sex" | "notes" | "memo";

/* ─── Pill ─── */
const Pill: React.FC<{ label: string; active: boolean; onClick: () => void; dot?: string }> = ({ label, active, onClick, dot }) => (
  <button type="button" onClick={onClick} style={{
    height: 32, borderRadius: 8, padding: "0 12px", fontSize: 13, fontWeight: 600,
    cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
    background: active ? "#0E2646" : "#FFFFFF",
    color: active ? "#FFFFFF" : "#1A1A1A",
    border: active ? "1.5px solid #0E2646" : "1px solid #D4D4D0",
  }}>
    {dot && <span style={{ width: 10, height: 10, borderRadius: 5, background: dot, flexShrink: 0 }} />}
    {label}
  </button>
);

/* ═══════════════════════════════════ MAIN ═══════════════════════════════════ */
const ReviewClosePage: React.FC = () => {
  const { id: saleDayId, woId } = useParams<{ id: string; woId: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const qc = useQueryClient();

  /* ── data ── */
  const { data: wo } = useQuery({
    queryKey: ["review_wo", woId], enabled: !!woId,
    queryFn: async () => {
      const { data } = await (supabase.from("work_orders") as any).select("*").eq("id", woId!).single();
      return data as unknown as WorkOrder | null;
    },
  });
  const { data: animalsRaw, refetch: refetchAnimals } = useQuery({
    queryKey: ["review_animals", woId], enabled: !!woId,
    queryFn: async () => {
      const { data } = await (supabase.from("sale_barn_animals") as any)
        .select("*").eq("work_order_id", woId!).order("created_at", { ascending: true });
      return (data ?? []) as unknown as SaleBarnAnimal[];
    },
  });
  const animals = animalsRaw ?? [];
  const { data: customerName } = useQuery({
    queryKey: ["review_customer", wo?.customer_id], enabled: !!wo?.customer_id,
    queryFn: async () => {
      const { data } = await (supabase.from("sale_barn_customers") as any)
        .select("name").eq("id", wo!.customer_id!).single();
      return (data as any)?.name as string ?? "Customer";
    },
  });
  const { data: dkData } = useDesignationKeys();
  const desKeys = dkData?.data ?? [];

  const expected = wo?.head_count ?? 0;
  const worked = animals.length;
  const short = Math.max(0, expected - worked);

  /* ── selection ── */
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const toggleSel = (id: string) => setSelected((prev) => {
    const n = new Set(prev);
    n.has(id) ? n.delete(id) : n.add(id);
    return n;
  });
  const selectAll = () => setSelected(new Set(animals.map((a) => a.id)));
  const clearSel = () => setSelected(new Set());

  /* ── batch edit ── */
  const [openField, setOpenField] = useState<BatchField | null>(null);
  const [batchPreg, setBatchPreg] = useState("");
  const [batchDes, setBatchDes] = useState("");
  const [batchSex, setBatchSex] = useState("");
  const [batchNotes, setBatchNotes] = useState<string[]>([]);
  const [batchMemo, setBatchMemo] = useState("");
  const [applying, setApplying] = useState(false);

  const toggleBatchNote = (n: string) => {
    if (BREED_NOTES.includes(n)) {
      setBatchNotes((prev) => {
        const wo2 = prev.filter((x) => !BREED_NOTES.includes(x));
        return prev.includes(n) ? wo2 : [...wo2, n];
      });
    } else {
      setBatchNotes((prev) => prev.includes(n) ? prev.filter((x) => x !== n) : [...prev, n]);
    }
  };

  const applyBatch = useCallback(async (field: BatchField) => {
    const ids = Array.from(selected);
    if (!ids.length) return;
    setApplying(true);
    let update: Record<string, any> = {};
    let label = "";
    if (field === "preg") { update = { preg_status: batchPreg || null }; label = "Preg status"; }
    else if (field === "designation") { update = { designation_key: batchDes || null }; label = "Designation"; }
    else if (field === "sex") { update = { sex: batchSex || null }; label = "Sex"; }
    else if (field === "notes") {
      const breedVal = batchNotes.find((n) => BREED_NOTES.includes(n)) ?? null;
      update = { quick_notes: batchNotes, breed: breedVal };
      label = "Quick notes";
    } else if (field === "memo") { update = { memo: batchMemo.trim() || null }; label = "Memo"; }

    await Promise.all(ids.map((aid) =>
      (supabase.from("sale_barn_animals") as any).update(update).eq("id", aid)
    ));
    setApplying(false);
    showToast("success", `Updated ${label} on ${ids.length} animals`);
    setOpenField(null);
    clearSel();
    refetchAnimals();
  }, [selected, batchPreg, batchDes, batchSex, batchNotes, batchMemo, showToast, refetchAnimals]);

  /* ── expanded card editing ── */
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editPreg, setEditPreg] = useState("");
  const [editDes, setEditDes] = useState("");
  const [editSex, setEditSex] = useState("");
  const [editTag, setEditTag] = useState("");
  const [editBack, setEditBack] = useState("");
  const [editMemo, setEditMemo] = useState("");
  const [editNotes, setEditNotes] = useState<string[]>([]);
  const [editSaving, setEditSaving] = useState(false);

  const expandAnimal = (a: SaleBarnAnimal) => {
    setExpandedId(a.id);
    setEditPreg(a.preg_status ?? "");
    setEditDes(a.designation_key ?? "");
    setEditSex(a.sex ?? "");
    setEditTag(a.tag_number ?? "");
    setEditBack(a.back_tag ?? "");
    setEditMemo(a.memo ?? "");
    setEditNotes(a.quick_notes ?? []);
  };

  const toggleEditNote = (n: string) => {
    if (BREED_NOTES.includes(n)) {
      setEditNotes((prev) => {
        const wo2 = prev.filter((x) => !BREED_NOTES.includes(x));
        return prev.includes(n) ? wo2 : [...wo2, n];
      });
    } else {
      setEditNotes((prev) => prev.includes(n) ? prev.filter((x) => x !== n) : [...prev, n]);
    }
  };

  const saveEdit = useCallback(async () => {
    if (!expandedId) return;
    setEditSaving(true);
    const breedVal = editNotes.find((n) => BREED_NOTES.includes(n)) ?? null;
    await (supabase.from("sale_barn_animals") as any).update({
      preg_status: editPreg || null,
      designation_key: editDes || null,
      sex: editSex || null,
      tag_number: editTag.trim() || null,
      back_tag: editBack.trim() || null,
      memo: editMemo.trim() || null,
      quick_notes: editNotes,
      breed: breedVal,
    }).eq("id", expandedId);
    setEditSaving(false);
    setExpandedId(null);
    showToast("success", "Animal updated");
    refetchAnimals();
  }, [expandedId, editPreg, editDes, editSex, editTag, editBack, editMemo, editNotes, showToast, refetchAnimals]);

  /* ── close work order ── */
  const [showCloseWarning, setShowCloseWarning] = useState(false);
  const [closing, setClosing] = useState(false);

  const handleClose = useCallback(async () => {
    if (short > 0 && !showCloseWarning) {
      setShowCloseWarning(true);
      return;
    }
    setClosing(true);
    await (supabase.from("work_orders") as any).update({ work_complete: true }).eq("id", woId);
    qc.invalidateQueries({ queryKey: ["work_orders"] });
    showToast("success", "Work order complete");
    navigate(`/sale-barn/${saleDayId}`);
  }, [short, showCloseWarning, woId, saleDayId, navigate, showToast, qc]);

  /* ══════ RENDER ══════ */
  return (
    <div style={{ paddingBottom: 100, fontFamily: "Inter, sans-serif" }}>
      {/* Header */}
      <div style={{ padding: "12px 16px 8px", display: "flex", alignItems: "center", gap: 10 }}>
        <button type="button" onClick={() => navigate(`/sale-barn/${saleDayId}/work-order/${woId}/chute`)}
          style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M15 18l-6-6 6-6" stroke="#0E2646" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, color: "#0E2646" }}>Review &amp; Close</div>
          <div style={{ fontSize: 12, fontWeight: 500, color: "#55BAAA" }}>
            {customerName ?? "Customer"} · {wo?.entity_type === "buyer" ? "Buyer" : "Seller"}
            {wo?.pens?.length ? ` · Pen ${wo.pens.join(", ")}` : ""}
          </div>
        </div>
      </div>

      <div style={{ padding: "0 16px" }}>
        {/* Summary stat cards */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 14 }}>
          {[
            { label: "Expected", value: expected, color: "#FFFFFF" },
            { label: "Worked", value: worked, color: "#55BAAA" },
            { label: "Short", value: short, color: short > 0 ? "#B8860B" : "#FFFFFF" },
          ].map((c) => (
            <div key={c.label} style={{
              background: "#0E2646", borderRadius: 10, padding: "10px 12px", textAlign: "center",
            }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: c.color }}>{c.value}</div>
              <div style={{ fontSize: 10, fontWeight: 500, color: "rgba(240,240,240,0.55)" }}>{c.label}</div>
            </div>
          ))}
        </div>

        {/* Batch Edit section — only when selection > 0 */}
        {selected.size > 0 && (
          <div style={{
            background: "#FFFFFF", borderRadius: 12, border: "1.5px solid #F3D12A",
            padding: "12px 14px", marginBottom: 14,
          }}>
            {/* header row */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: "#0E2646" }}>Batch edit</span>
              <span style={{
                fontSize: 11, fontWeight: 700, color: "#B8860B",
                background: "rgba(243,209,42,0.15)", borderRadius: 9999, padding: "2px 8px",
              }}>{selected.size} selected</span>
              <div style={{ flex: 1 }} />
              <button type="button" onClick={selectAll} style={{
                border: "1px solid #55BAAA", background: "transparent", color: "#55BAAA",
                fontSize: 11, fontWeight: 600, padding: "4px 10px", borderRadius: 9999, cursor: "pointer",
              }}>Select all</button>
              <button type="button" onClick={clearSel} style={{
                border: "1px solid #D4D4D0", background: "transparent", color: "#717182",
                fontSize: 11, fontWeight: 600, padding: "4px 10px", borderRadius: 9999, cursor: "pointer",
              }}>Clear</button>
            </div>

            <div style={{ fontSize: 11, fontWeight: 600, color: "#717182", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>
              APPLY TO SELECTED
            </div>

            {/* field buttons */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: openField ? 8 : 0 }}>
              {(["preg", "designation", "sex", "notes", "memo"] as BatchField[]).map((f) => {
                const labels: Record<BatchField, string> = { preg: "Preg Status", designation: "Designation", sex: "Sex", notes: "Quick Notes", memo: "Memo" };
                return (
                  <button key={f} type="button" onClick={() => setOpenField(openField === f ? null : f)} style={{
                    background: openField === f ? "#0E2646" : "rgba(14,38,70,0.04)",
                    border: openField === f ? "1px solid #0E2646" : "1px solid rgba(212,212,208,0.60)",
                    borderRadius: 8, padding: "6px 10px", cursor: "pointer",
                    fontSize: 12, fontWeight: 600, color: openField === f ? "#FFFFFF" : "#0E2646",
                    display: "flex", alignItems: "center", gap: 4,
                  }}>
                    {labels[f]}
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                      <path d="M2.5 3.75L5 6.25L7.5 3.75" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                );
              })}
            </div>

            {/* picker panels */}
            {openField && (
              <div style={{ background: "#F5F5F0", borderRadius: 8, padding: "8px 10px", marginTop: 8 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: "#717182", marginBottom: 6 }}>
                  {openField === "preg" && `Preg status → apply to ${selected.size} animals`}
                  {openField === "designation" && `Designation → apply to ${selected.size} animals`}
                  {openField === "sex" && `Sex → apply to ${selected.size} animals`}
                  {openField === "notes" && `Quick notes → apply to ${selected.size} animals`}
                  {openField === "memo" && `Memo → apply to ${selected.size} animals`}
                </div>

                {openField === "preg" && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
                    {PREG_OPTIONS.map((p) => <Pill key={p} label={p} active={batchPreg === p} onClick={() => setBatchPreg(batchPreg === p ? "" : p)} />)}
                  </div>
                )}
                {openField === "designation" && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
                    {desKeys.map((dk) => <Pill key={dk.id} label={dk.label} dot={dk.hex_color} active={batchDes === dk.label} onClick={() => setBatchDes(batchDes === dk.label ? "" : dk.label)} />)}
                  </div>
                )}
                {openField === "sex" && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
                    {SEX_OPTIONS.map((s) => <Pill key={s} label={s} active={batchSex === s} onClick={() => setBatchSex(batchSex === s ? "" : s)} />)}
                  </div>
                )}
                {openField === "notes" && (
                  <div style={{ marginBottom: 8 }}>
                    {NOTE_GROUPS.map(({ notes, color }) => (
                      <div key={color} style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 6 }}>
                        {notes.map((n) => {
                          const sel = batchNotes.includes(n);
                          const rgb = COLOR_RGB[color];
                          return (
                            <button key={n} type="button" onClick={() => toggleBatchNote(n)} style={{
                              height: 30, borderRadius: 9999, padding: "0 12px", fontSize: 12, fontWeight: sel ? 700 : 500,
                              cursor: "pointer", display: "flex", alignItems: "center", gap: 4,
                              background: sel ? color : `rgba(${rgb},0.12)`,
                              color: sel ? "#FFFFFF" : color,
                              border: sel ? `2px solid ${color}` : "1px solid transparent",
                            }}>
                              {sel && <span>✓</span>}{n}
                            </button>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                )}
                {openField === "memo" && (
                  <textarea rows={2} value={batchMemo} onChange={(e) => setBatchMemo(e.target.value)}
                    placeholder="Memo text to apply to all selected..."
                    style={{
                      width: "100%", borderRadius: 8, border: "1px solid #D4D4D0",
                      fontSize: 16, fontFamily: "Inter, sans-serif", padding: "8px 12px",
                      outline: "none", resize: "vertical", boxSizing: "border-box", marginBottom: 8,
                    }}
                    onFocus={focusGold as any} onBlur={blurReset as any}
                  />
                )}

                <button type="button" className="active:scale-[0.97]" disabled={applying}
                  onClick={() => applyBatch(openField)}
                  style={{
                    width: "100%", height: 36, borderRadius: 9999,
                    background: "#F3D12A", border: "none", fontSize: 13, fontWeight: 700, color: "#1A1A1A",
                    cursor: applying ? "not-allowed" : "pointer", opacity: applying ? 0.6 : 1,
                  }}>
                  {applying ? "Applying…" : `Apply to ${selected.size} animals`}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Animal list */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: "#0E2646" }}>Animals ({animals.length})</span>
          <div style={{ flex: 1 }} />
          {selected.size === 0 && animals.length > 0 && (
            <button type="button" onClick={selectAll} style={{
              border: "1px solid #D4D4D0", background: "transparent", color: "#717182",
              fontSize: 11, fontWeight: 600, padding: "4px 10px", borderRadius: 9999, cursor: "pointer",
            }}>Select all</button>
          )}
        </div>

        {animals.map((a, i) => {
          const isSel = selected.has(a.id);
          const isExpanded = expandedId === a.id;
          const eidDisplay = a.eid.length > 2
            ? <><span>{a.eid.slice(0, -2)}</span><span style={{ color: "#717182" }}>{a.eid.slice(-2)}</span></>
            : a.eid;

          return (
            <div key={a.id} style={{
              background: "#FFFFFF", borderRadius: 10, marginBottom: 6,
              border: isSel ? "2px solid #F3D12A" : "1px solid rgba(212,212,208,0.60)",
              padding: isSel ? "9px 11px" : "10px 12px",
            }}>
              <div style={{ display: "flex", gap: 10 }}>
                {/* checkbox */}
                <button type="button" onClick={() => toggleSel(a.id)} style={{
                  width: 20, height: 20, borderRadius: 4, flexShrink: 0, marginTop: 2, cursor: "pointer",
                  background: isSel ? "#F3D12A" : "#FFFFFF",
                  border: isSel ? "none" : "1.5px solid #D4D4D0",
                  display: "flex", alignItems: "center", justifyContent: "center", padding: 0,
                }}>
                  {isSel && (
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <path d="M2.5 6L5 8.5L9.5 4" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </button>

                {/* content — tap to expand */}
                <div style={{ flex: 1, minWidth: 0, cursor: "pointer" }}
                  onClick={() => isExpanded ? setExpandedId(null) : expandAnimal(a)}>
                  {/* Row 1 */}
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: "#1A1A1A" }}>{eidDisplay}</span>
                    {a.tag_number && <span style={{ fontSize: 11, color: "#717182" }}>Tag {a.tag_number}</span>}
                  </div>
                  {/* Row 2 */}
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 3, alignItems: "center" }}>
                    {a.designation_key ? (
                      <span style={{ fontSize: 11, fontWeight: 600, display: "flex", alignItems: "center", gap: 3 }}>
                        <span style={{
                          width: 8, height: 8, borderRadius: 4,
                          background: desKeys.find((d) => d.label === a.designation_key)?.hex_color ?? "#717182",
                        }} />
                        {a.designation_key}
                      </span>
                    ) : <span style={{ fontSize: 11, fontStyle: "italic", color: "#717182" }}>No designation</span>}

                    {a.preg_status ? (
                      <span style={{ fontSize: 11, fontWeight: 600, color: pregColor(a.preg_status) }}>{a.preg_status}</span>
                    ) : <span style={{ fontSize: 11, fontStyle: "italic", color: "#717182" }}>No preg</span>}

                    {a.sex ? (
                      <span style={{ fontSize: 11, color: "#717182" }}>{a.sex}</span>
                    ) : <span style={{ fontSize: 11, fontStyle: "italic", color: "#717182" }}>No sex</span>}

                    {(a.quick_notes ?? []).map((n) => {
                      const c = noteColor(n);
                      const rgb = COLOR_RGB[c];
                      return (
                        <span key={n} style={{
                          fontSize: 10, fontWeight: 600, color: c,
                          background: `rgba(${rgb},0.12)`, borderRadius: 9999, padding: "1px 6px",
                        }}>{n}</span>
                      );
                    })}
                  </div>
                </div>

                {/* row number */}
                <span style={{ fontSize: 11, color: "#717182", flexShrink: 0, marginTop: 2 }}>#{i + 1}</span>
              </div>

              {/* Expanded edit */}
              {isExpanded && (
                <div style={{ marginTop: 10, borderTop: "1px solid rgba(212,212,208,0.30)", paddingTop: 10 }}>
                  <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: "#717182", marginBottom: 3 }}>Tag #</div>
                      <input style={{ ...INPUT, width: "100%", flex: "none" }} value={editTag}
                        onChange={(e) => setEditTag(e.target.value)} onFocus={focusGold} onBlur={blurReset} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: "#717182", marginBottom: 3 }}>Back Tag</div>
                      <input style={{ ...INPUT, width: "100%", flex: "none" }} value={editBack}
                        onChange={(e) => setEditBack(e.target.value)} onFocus={focusGold} onBlur={blurReset} />
                    </div>
                  </div>

                  <div style={{ fontSize: 11, fontWeight: 600, color: "#717182", marginBottom: 3 }}>Preg Status</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
                    {PREG_OPTIONS.map((p) => <Pill key={p} label={p} active={editPreg === p} onClick={() => setEditPreg(editPreg === p ? "" : p)} />)}
                  </div>

                  <div style={{ fontSize: 11, fontWeight: 600, color: "#717182", marginBottom: 3 }}>Designation</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
                    {desKeys.map((dk) => <Pill key={dk.id} label={dk.label} dot={dk.hex_color} active={editDes === dk.label} onClick={() => setEditDes(editDes === dk.label ? "" : dk.label)} />)}
                  </div>

                  <div style={{ fontSize: 11, fontWeight: 600, color: "#717182", marginBottom: 3 }}>Sex</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
                    {SEX_OPTIONS.map((s) => <Pill key={s} label={s} active={editSex === s} onClick={() => setEditSex(editSex === s ? "" : s)} />)}
                  </div>

                  <div style={{ fontSize: 11, fontWeight: 600, color: "#717182", marginBottom: 3 }}>Quick Notes</div>
                  {NOTE_GROUPS.map(({ notes, color }) => (
                    <div key={color} style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 5 }}>
                      {notes.map((n) => {
                        const sel = editNotes.includes(n);
                        const rgb = COLOR_RGB[color];
                        return (
                          <button key={n} type="button" onClick={() => toggleEditNote(n)} style={{
                            height: 28, borderRadius: 9999, padding: "0 10px", fontSize: 11, fontWeight: sel ? 700 : 500,
                            cursor: "pointer", display: "flex", alignItems: "center", gap: 3,
                            background: sel ? color : `rgba(${rgb},0.12)`,
                            color: sel ? "#FFFFFF" : color,
                            border: sel ? `2px solid ${color}` : "1px solid transparent",
                          }}>
                            {sel && <span>✓</span>}{n}
                          </button>
                        );
                      })}
                    </div>
                  ))}

                  <div style={{ fontSize: 11, fontWeight: 600, color: "#717182", marginBottom: 3, marginTop: 6 }}>Memo</div>
                  <textarea rows={2} value={editMemo} onChange={(e) => setEditMemo(e.target.value)}
                    style={{
                      width: "100%", borderRadius: 8, border: "1px solid #D4D4D0",
                      fontSize: 16, fontFamily: "Inter, sans-serif", padding: "8px 12px",
                      outline: "none", resize: "vertical", boxSizing: "border-box", marginBottom: 8,
                    }}
                    onFocus={focusGold as any} onBlur={blurReset as any}
                  />

                  <button type="button" className="active:scale-[0.97]" disabled={editSaving} onClick={saveEdit}
                    style={{
                      height: 32, borderRadius: 9999, padding: "0 16px",
                      background: "#F3D12A", border: "none", fontSize: 12, fontWeight: 700, color: "#1A1A1A",
                      cursor: editSaving ? "not-allowed" : "pointer", opacity: editSaving ? 0.6 : 1,
                    }}>
                    {editSaving ? "Saving…" : "Save"}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Sticky bottom bar */}
      <div style={{
        position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 40,
        background: "#FFFFFF", borderTop: "1px solid #D4D4D0", padding: "12px 16px",
      }}>
        {showCloseWarning && short > 0 && (
          <div style={{
            background: "rgba(243,209,42,0.08)", border: "1px solid rgba(243,209,42,0.30)",
            borderRadius: 10, padding: "10px 14px", marginBottom: 10,
          }}>
            <div style={{ fontSize: 13, color: "#B8860B", marginBottom: 8 }}>
              You have {short} fewer animal{short !== 1 ? "s" : ""} than expected. Close anyway?
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button type="button" onClick={() => setShowCloseWarning(false)} style={{
                flex: 1, height: 36, borderRadius: 9999, border: "1.5px solid #D4D4D0",
                background: "transparent", fontSize: 13, fontWeight: 600, color: "#717182", cursor: "pointer",
              }}>Cancel</button>
              <button type="button" className="active:scale-[0.97]" onClick={handleClose} disabled={closing} style={{
                flex: 1, height: 36, borderRadius: 9999, border: "none",
                background: "#55BAAA", fontSize: 13, fontWeight: 700, color: "#FFFFFF",
                cursor: closing ? "not-allowed" : "pointer", opacity: closing ? 0.6 : 1,
              }}>{closing ? "Closing…" : "Close Anyway"}</button>
            </div>
          </div>
        )}

        <button type="button" className="active:scale-[0.97]" onClick={handleClose} disabled={closing}
          style={{
            width: "100%", height: 52, borderRadius: 9999,
            background: "#55BAAA", border: "none",
            fontSize: 16, fontWeight: 700, color: "#FFFFFF",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            cursor: closing ? "not-allowed" : "pointer", opacity: closing ? 0.6 : 1,
          }}>
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M3.75 9L7.5 12.75L14.25 6" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Mark work complete
        </button>
      </div>
    </div>
  );
};

export default ReviewClosePage;
