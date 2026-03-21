import React, { useState, useMemo, useEffect, useRef, useCallback } from "react";
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
const LABEL_S: React.CSSProperties = {
  width: 85, flexShrink: 0, fontSize: 14, fontWeight: 600,
  color: "#1A1A1A", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
};

const FR: React.FC<{ label: string; req?: boolean; children: React.ReactNode }> = ({ label, req, children }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0, marginBottom: 8 }}>
    <span style={LABEL_S}>{label}{req && <span style={{ color: "#9B2335", marginLeft: 2 }}>*</span>}</span>
    <div style={{ flex: 1, minWidth: 0, display: "flex", position: "relative" }}>{children}</div>
  </div>
);

const PREG_OPTIONS = ["Pregnant", "Open", "Out", "Not Checked"];

const RED_NOTES = ["Horns", "Lame", "Lump Jaw", "Bad Eye", "Cancer Eye"];
const GOLD_NOTES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const TEAL_NOTES = ["Thin", "Old", "Broken Mouth"];

type NoteColor = "#9B2335" | "#B8860B" | "#55BAAA";
const NOTE_MAP: { notes: string[]; color: NoteColor }[] = [
  { notes: RED_NOTES, color: "#9B2335" },
  { notes: GOLD_NOTES, color: "#B8860B" },
  { notes: TEAL_NOTES, color: "#55BAAA" },
];

const noteColor = (n: string): NoteColor => {
  if (RED_NOTES.includes(n)) return "#9B2335";
  if (GOLD_NOTES.includes(n)) return "#B8860B";
  return "#55BAAA";
};

/* ── Collapsible ── */
const Collapsible: React.FC<{
  title: string; badge?: string; defaultOpen?: boolean; children: React.ReactNode;
}> = ({ title, badge, defaultOpen = false, children }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={CARD}>
      <button type="button" onClick={() => setOpen(!open)} style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        width: "100%", background: "none", border: "none", cursor: "pointer", padding: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 15, fontWeight: 600, color: "#1A1A1A" }}>{title}</span>
          {badge && <span style={{ fontSize: 11, fontWeight: 500, color: "#717182" }}>{badge}</span>}
        </div>
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none"
          style={{ transition: "transform 250ms", transform: open ? "rotate(180deg)" : "rotate(0deg)" }}>
          <path d="M4.5 6.75L9 11.25L13.5 6.75" stroke="#717182" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      <div style={{
        maxHeight: open ? 1200 : 0, opacity: open ? 1 : 0, overflow: "hidden",
        transition: "max-height 250ms ease-in-out, opacity 250ms ease-in-out",
        marginTop: open ? 10 : 0,
      }}>{children}</div>
    </div>
  );
};

/* ── Sort Modal ── */
const SortModal: React.FC<{
  open: boolean; onClose: () => void; onConfirm: (pen: string) => void;
}> = ({ open, onClose, onConfirm }) => {
  const [pen, setPen] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { if (open) { setPen(""); setTimeout(() => inputRef.current?.focus(), 100); } }, [open]);
  if (!open) return null;
  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(0,0,0,0.52)" }} />
      <div style={{
        position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", zIndex: 101,
        background: "#FFFFFF", borderRadius: 16, padding: "20px 18px", width: "min(340px,90vw)",
        boxShadow: "0 8px 30px rgba(0,0,0,0.18)",
      }}>
        <div style={{ fontSize: 17, fontWeight: 700, color: "#0E2646", marginBottom: 4 }}>Sort Animal</div>
        <div style={{ fontSize: 13, color: "#717182", marginBottom: 14 }}>Where is this animal being sorted to?</div>
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "#717182", marginBottom: 4 }}>Dest. Pen</div>
          <input ref={inputRef} style={{ ...INPUT, width: "100%", flex: "none" }} placeholder="Pen number"
            value={pen} onChange={(e) => setPen(e.target.value)}
            onFocus={focusGold} onBlur={blurReset}
            onKeyDown={(e) => { if (e.key === "Enter" && pen.trim()) onConfirm(pen.trim()); }}
          />
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button type="button" onClick={onClose} style={{
            flex: 1, height: 42, borderRadius: 9999, border: "1.5px solid #D4D4D0",
            background: "transparent", fontSize: 14, fontWeight: 600, color: "#717182", cursor: "pointer",
          }}>Cancel</button>
          <button type="button" className="active:scale-[0.97]" disabled={!pen.trim()}
            onClick={() => onConfirm(pen.trim())}
            style={{
              flex: 1, height: 42, borderRadius: 9999, border: "none",
              background: "#F3D12A", fontSize: 14, fontWeight: 700, color: "#1A1A1A",
              cursor: pen.trim() ? "pointer" : "not-allowed", opacity: pen.trim() ? 1 : 0.5,
            }}>Confirm Sort</button>
        </div>
      </div>
    </>
  );
};

/* ── Main Page ── */
const ChutesideEntry: React.FC = () => {
  const { id: saleDayId, woId } = useParams<{ id: string; woId: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const qc = useQueryClient();

  /* data */
  const { data: wo } = useQuery({
    queryKey: ["work_order_chute", woId],
    enabled: !!woId,
    queryFn: async () => {
      const { data } = await (supabase.from("work_orders") as any).select("*").eq("id", woId!).single();
      return data as unknown as WorkOrder | null;
    },
  });

  const { data: animalsData, refetch: refetchAnimals } = useQuery({
    queryKey: ["chute_animals", woId],
    enabled: !!woId,
    queryFn: async () => {
      const { data } = await (supabase.from("sale_barn_animals") as any)
        .select("*").eq("work_order_id", woId!)
        .order("created_at", { ascending: false });
      return (data ?? []) as unknown as SaleBarnAnimal[];
    },
  });
  const animals = animalsData ?? [];

  const { data: dkData } = useDesignationKeys();
  const desKeys = dkData?.data ?? [];

  /* customer name */
  const { data: customerName } = useQuery({
    queryKey: ["chute_customer", wo?.customer_id],
    enabled: !!wo?.customer_id,
    queryFn: async () => {
      const { data } = await (supabase.from("sale_barn_customers") as any)
        .select("name").eq("id", wo!.customer_id!).single();
      return (data as any)?.name as string ?? "Customer";
    },
  });

  const expected = wo?.head_count ?? 0;
  const worked = animals.length;
  const pct = expected > 0 ? Math.min((worked / expected) * 100, 100) : 0;
  const pensLabel = (wo?.pens ?? []).join(", ");

  /* form state */
  const eidRef = useRef<HTMLInputElement>(null);
  const [eid, setEid] = useState("");
  const [backTag, setBackTag] = useState("");
  const [tagNumber, setTagNumber] = useState("");
  const [designation, setDesignation] = useState("");
  const [pregStatus, setPregStatus] = useState("");
  const [sex, setSex] = useState("");
  const [breed, setBreed] = useState("");
  const [quickNotes, setQuickNotes] = useState<string[]>([]);
  const [eid2, setEid2] = useState("");
  const [sorted, setSorted] = useState(false);
  const [sortDestPen, setSortDestPen] = useState("");
  const [sortModalOpen, setSortModalOpen] = useState(false);
  const [groupNotes, setGroupNotes] = useState(wo?.group_notes ?? "");
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (wo?.group_notes) setGroupNotes(wo.group_notes); }, [wo]);

  const clearForm = useCallback(() => {
    setEid(""); setBackTag(""); setTagNumber(""); setDesignation("");
    setPregStatus(""); setSex(""); setBreed(""); setQuickNotes([]); setEid2("");
    setSorted(false); setSortDestPen("");
    setTimeout(() => eidRef.current?.focus(), 50);
  }, []);

  const toggleNote = (n: string) => setQuickNotes((prev) =>
    prev.includes(n) ? prev.filter((x) => x !== n) : [...prev, n]
  );

  /* save */
  const handleSave = useCallback(async () => {
    if (!eid.trim()) { showToast("error", "EID is required"); eidRef.current?.focus(); return; }
    setSaving(true);

    const animalRow: Record<string, any> = {
      work_order_id: woId,
      eid: eid.trim(),
      back_tag: backTag.trim() || null,
      eid_2: eid2.trim() || null,
      tag_number: tagNumber.trim() || null,
      designation_key: designation || null,
      preg_status: pregStatus || null,
      sex: sex || null,
      breed: breed.trim() || null,
      quick_notes: quickNotes,
      sorted,
      sort_dest_pen: sorted ? sortDestPen : null,
    };

    const { error } = await (supabase.from("sale_barn_animals") as any).insert(animalRow);
    if (error) { setSaving(false); showToast("error", error.message); return; }

    if (sorted && sortDestPen) {
      await (supabase.from("sort_records") as any).insert({
        animal_id: eid.trim(),
        source_pen: (wo?.pens ?? [])[0] ?? "",
        dest_pen: sortDestPen,
        work_order_id: woId,
      });
    }

    setSaving(false);
    refetchAnimals();
    const newCount = worked + 1;
    showToast("success", `Saved #${newCount} of ${expected} — Next`);
    try { navigator.vibrate?.(50); } catch {}
    clearForm();
  }, [eid, backTag, eid2, tagNumber, designation, pregStatus, sex, breed, quickNotes, sorted, sortDestPen, woId, wo, worked, expected, clearForm, showToast, refetchAnimals]);

  /* detail summary for badge */
  const detailParts: string[] = [];
  if (sex) detailParts.push(sex);
  if (breed) detailParts.push(breed);
  if (quickNotes.length) detailParts.push(`${quickNotes.length} notes`);
  const detailBadge = detailParts.length > 0 ? detailParts.join(" · ") : undefined;

  return (
    <div style={{ paddingBottom: 80 }}>
      {/* Group Defaults Banner */}
      <div style={{
        background: "linear-gradient(135deg, #0E2646 0%, #163A5E 100%)",
        padding: "10px 16px", borderBottom: "2px solid #55BAAA",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: "#F0F0F0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {customerName ?? "Customer"}
            </div>
            <div style={{ fontSize: 12, fontWeight: 400, color: "rgba(240,240,240,0.60)" }}>
              {wo?.entity_type === "buyer" ? "Buyer" : "Seller"}
              {wo?.buyer_num ? ` · #${wo.buyer_num}` : ""}
              {wo?.animal_type ? ` · ${wo.animal_type}` : ""}
            </div>
          </div>
          <div style={{ textAlign: "center", flexShrink: 0, marginLeft: 12 }}>
            <div>
              <span style={{ fontSize: 24, fontWeight: 700, color: "#FFFFFF" }}>{worked}</span>
              <span style={{ fontSize: 14, fontWeight: 500, color: "rgba(255,255,255,0.45)" }}> / {expected}</span>
            </div>
            <div style={{ fontSize: 10, fontWeight: 600, color: "rgba(168,230,218,0.70)", letterSpacing: "0.06em", textTransform: "uppercase" }}>HEAD</div>
          </div>
        </div>
        {/* Progress */}
        <div style={{ width: "100%", height: 4, borderRadius: 2, background: "rgba(255,255,255,0.10)", marginTop: 8 }}>
          <div style={{ width: `${pct}%`, height: "100%", borderRadius: 2, background: "#55BAAA", transition: "width 300ms" }} />
        </div>
      </div>

      {/* Group Notes */}
      <div style={{ padding: "8px 16px 4px" }}>
        <div style={{
          background: "#FFFFFF", borderRadius: 8, border: "1px solid rgba(212,212,208,0.40)",
          padding: "8px 12px", display: "flex", alignItems: "center", gap: 6,
        }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: "#717182", flexShrink: 0 }}>Group:</span>
          <input
            style={{ border: "none", background: "transparent", fontSize: 13, outline: "none", flex: 1, minWidth: 0 }}
            placeholder="Group notes…" value={groupNotes}
            onChange={(e) => setGroupNotes(e.target.value)}
            onBlur={() => {
              if (woId && groupNotes !== (wo?.group_notes ?? "")) {
                (supabase.from("work_orders") as any).update({ group_notes: groupNotes || null }).eq("id", woId);
              }
            }}
          />
        </div>
      </div>

      {/* Entry Card */}
      <div style={{ padding: "6px 16px 0" }}>
        <div style={CARD}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#0E2646" }}>Animal #{worked + 1}</span>
            {sorted && (
              <span style={{
                fontSize: 10, fontWeight: 700, color: "#7B68EE",
                background: "rgba(168,168,240,0.15)", borderRadius: 9999, padding: "2px 8px",
              }}>SORT PENDING</span>
            )}
          </div>

          <FR label="EID" req>
            <input ref={eidRef} style={INPUT} placeholder="Scan or type EID" value={eid}
              onChange={(e) => setEid(e.target.value)} onFocus={focusGold} onBlur={blurReset} autoFocus />
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" style={{ position: "absolute", right: 10, top: 9 }}>
              <rect x="2" y="4" width="2" height="10" rx="0.5" fill="#717182" />
              <rect x="5" y="4" width="1.5" height="10" rx="0.5" fill="#717182" />
              <rect x="8" y="4" width="2.5" height="10" rx="0.5" fill="#717182" />
              <rect x="12" y="4" width="1" height="10" rx="0.5" fill="#717182" />
              <rect x="14.5" y="4" width="1.5" height="10" rx="0.5" fill="#717182" />
            </svg>
          </FR>

          <FR label="Back Tag">
            <input style={INPUT} placeholder="Back tag" value={backTag}
              onChange={(e) => setBackTag(e.target.value)} onFocus={focusGold} onBlur={blurReset} />
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" style={{ position: "absolute", right: 10, top: 9 }}>
              <rect x="3" y="5" width="1.5" height="8" fill="#717182" /><rect x="5.5" y="5" width="1" height="8" fill="#717182" />
              <rect x="7.5" y="5" width="2" height="8" fill="#717182" /><rect x="10.5" y="5" width="1" height="8" fill="#717182" />
              <rect x="12.5" y="5" width="1.5" height="8" fill="#717182" /><rect x="15" y="5" width="1" height="8" fill="#717182" />
            </svg>
          </FR>

          <FR label="Tag #">
            <input style={INPUT} placeholder="Tag number" value={tagNumber}
              onChange={(e) => setTagNumber(e.target.value)} onFocus={focusGold} onBlur={blurReset} />
          </FR>

          {/* Designation pills */}
          <FR label="Designation">
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, flex: 1 }}>
              {desKeys.map((dk) => {
                const active = designation === dk.label;
                return (
                  <button key={dk.id} type="button" onClick={() => setDesignation(active ? "" : dk.label)}
                    style={{
                      height: 34, borderRadius: 8, padding: "0 12px", fontSize: 14, fontWeight: 600,
                      display: "flex", alignItems: "center", gap: 6, cursor: "pointer",
                      background: active ? "#0E2646" : "#FFFFFF",
                      color: active ? "#FFFFFF" : "#1A1A1A",
                      border: active ? "1.5px solid #0E2646" : "1px solid #D4D4D0",
                    }}>
                    <span style={{ width: 10, height: 10, borderRadius: 5, background: dk.hex_color, flexShrink: 0 }} />
                    {dk.label}
                  </button>
                );
              })}
            </div>
          </FR>

          {/* Preg Status pills */}
          <FR label="Preg Status">
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, flex: 1 }}>
              {PREG_OPTIONS.map((p) => {
                const active = pregStatus === p;
                return (
                  <button key={p} type="button" onClick={() => setPregStatus(active ? "" : p)}
                    style={{
                      height: 34, borderRadius: 8, padding: "0 12px", fontSize: 14, fontWeight: 600,
                      cursor: "pointer",
                      background: active ? "#0E2646" : "#FFFFFF",
                      color: active ? "#FFFFFF" : "#1A1A1A",
                      border: active ? "1.5px solid #0E2646" : "1px solid #D4D4D0",
                    }}>
                    {p}
                  </button>
                );
              })}
            </div>
          </FR>
        </div>

        {/* Details Collapsible */}
        <Collapsible title="Details" badge={detailBadge} defaultOpen={false}>
          {/* Collapsed preview: sex, breed, quick note pills */}
          <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#717182", marginBottom: 4 }}>Sex</div>
              <select style={{ ...INPUT, width: "100%", flex: "none", appearance: "none", WebkitAppearance: "none" }}
                value={sex} onChange={(e) => setSex(e.target.value)}
                onFocus={focusGold as any} onBlur={blurReset as any}>
                <option value="">—</option>
                <option value="Bull">Bull</option>
                <option value="Heifer">Heifer</option>
                <option value="Steer">Steer</option>
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#717182", marginBottom: 4 }}>Breed</div>
              <input style={{ ...INPUT, width: "100%", flex: "none" }} placeholder="Breed"
                value={breed} onChange={(e) => setBreed(e.target.value)}
                onFocus={focusGold} onBlur={blurReset} />
            </div>
          </div>

          {/* Quick Notes */}
          <div style={{ fontSize: 12, fontWeight: 600, color: "#717182", marginBottom: 6 }}>Quick Notes</div>
          {NOTE_MAP.map(({ notes, color }) => (
            <div key={color} style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 6 }}>
              {notes.map((n) => {
                const sel = quickNotes.includes(n);
                return (
                  <button key={n} type="button" onClick={() => toggleNote(n)} style={{
                    height: 30, borderRadius: 9999, padding: "0 12px", fontSize: 12, fontWeight: sel ? 700 : 500,
                    cursor: "pointer", display: "flex", alignItems: "center", gap: 4,
                    background: sel ? color : `rgba(${color === "#9B2335" ? "155,35,53" : color === "#B8860B" ? "184,134,11" : "85,186,170"},0.12)`,
                    color: sel ? "#FFFFFF" : color,
                    border: sel ? `2px solid ${color}` : "1px solid transparent",
                  }}>
                    {sel && <span>✓</span>}
                    {n}
                  </button>
                );
              })}
            </div>
          ))}

          {/* EID 2 */}
          <div style={{ marginTop: 8 }}>
            <FR label="EID 2">
              <input style={INPUT} placeholder="Secondary EID" value={eid2}
                onChange={(e) => setEid2(e.target.value)} onFocus={focusGold} onBlur={blurReset} />
            </FR>
          </div>
        </Collapsible>

        {/* Sort Button */}
        <button
          type="button"
          className="active:scale-[0.97]"
          onClick={() => setSortModalOpen(true)}
          style={{
            width: "100%", height: 44, borderRadius: 10, marginBottom: 10,
            border: sorted ? "2px solid #7B68EE" : "1.5px solid #D4D4D0",
            background: sorted ? "rgba(168,168,240,0.08)" : "transparent",
            color: sorted ? "#7B68EE" : "#717182",
            fontSize: 14, fontWeight: 600, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
          }}
        >
          {sorted ? (
            <>Sort Pending — Pen {sortDestPen} — Tap to Change</>
          ) : (
            <>
              Sort This Animal
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M7 3v8M4 8l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </>
          )}
        </button>

        {/* Worked Animals List */}
        {animals.length > 0 && (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "12px 0 8px" }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: "#0E2646" }}>Worked</span>
              <div style={{ flex: 1, height: 1, background: "rgba(26,26,26,0.08)" }} />
              <span style={{ fontSize: 12, fontWeight: 600, color: "rgba(26,26,26,0.35)" }}>{animals.length}</span>
            </div>
            {animals.map((a, i) => {
              const displayId = a.tag_number || (a.eid.length > 6 ? `…${a.eid.slice(-6)}` : a.eid);
              const parts: string[] = [];
              if (a.designation_key) parts.push(a.designation_key);
              if (a.preg_status) parts.push(a.preg_status);
              if (a.quick_notes?.length) parts.push(a.quick_notes.join(", "));
              return (
                <button
                  key={a.id} type="button"
                  className="active:scale-[0.98]"
                  onClick={() => showToast("info", `Edit animal #${a.id.slice(0, 8)}`)}
                  style={{
                    width: "100%", textAlign: "left", cursor: "pointer",
                    background: "#0E2646", borderRadius: 10, padding: "10px 14px", marginBottom: 6,
                    border: "none", display: "flex", alignItems: "center", justifyContent: "space-between",
                  }}
                >
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontSize: 14, fontWeight: 600, color: "#F0F0F0" }}>{displayId}</span>
                      {a.sorted && (
                        <span style={{
                          fontSize: 9, fontWeight: 700, color: "#7B68EE", letterSpacing: "0.06em",
                          background: "rgba(168,168,240,0.15)", borderRadius: 9999, padding: "2px 6px",
                        }}>SORTED</span>
                      )}
                    </div>
                    {parts.length > 0 && (
                      <div style={{ fontSize: 12, fontWeight: 400, color: "rgba(240,240,240,0.55)", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {parts.join(" · ")}
                      </div>
                    )}
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 600, color: "rgba(240,240,240,0.35)", flexShrink: 0, marginLeft: 8 }}>
                    #{animals.length - i}
                  </span>
                </button>
              );
            })}
          </>
        )}
      </div>

      {/* Sort Modal */}
      <SortModal open={sortModalOpen} onClose={() => setSortModalOpen(false)}
        onConfirm={(pen) => { setSorted(true); setSortDestPen(pen); setSortModalOpen(false); }} />

      {/* Sticky Save & Next */}
      <div style={{
        position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 40,
        padding: "10px 16px 14px",
        background: "linear-gradient(0deg, #FFFFFF 70%, rgba(255,255,255,0) 100%)",
      }}>
        <button
          type="button"
          className="active:scale-[0.97]"
          onClick={handleSave}
          disabled={saving}
          style={{
            width: "100%", height: 52, borderRadius: 9999,
            background: "#F3D12A", border: "none",
            fontSize: 17, fontWeight: 700, color: "#1A1A1A",
            boxShadow: "0 2px 10px rgba(243,209,42,0.35)",
            cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.6 : 1,
          }}
        >
          {saving ? "Saving…" : `Save & Next (${worked}/${expected})`}
        </button>
      </div>
    </div>
  );
};

export default ChutesideEntry;
