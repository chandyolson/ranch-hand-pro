import { useState } from "react";
import { useNavigate } from "react-router-dom";
import FlagIcon from "../components/FlagIcon";
import CollapsibleSection from "../components/CollapsibleSection";
import PillButton from "../components/PillButton";
import { useChuteSideToast } from "../components/ToastContext";
import {
  FLAG_OPTIONS, TAG_COLOR_OPTIONS, TAG_COLOR_HEX, SEX_OPTIONS, ANIMAL_TYPE_OPTIONS,
  YEAR_OPTIONS, STATUS_OPTIONS, QUICK_NOTES,
  type FlagColor,
} from "@/lib/constants";
import { LABEL_STYLE, INPUT_BASE, INPUT_READONLY, SUB_LABEL, focusGold, blurReset } from "@/lib/styles";

const quickNoteLabels = QUICK_NOTES.map(n => n.label);

const animalRecord = {
  tag: "3309",
  tagColor: "Pink",
  tagColorHex: "#E8A0BF",
  sex: "Cow",
  animalType: "Cow",
  yearBorn: "2020",
  status: "Active",
  flag: "teal" as FlagColor | null,
  flagReason: "Spring calving group — monitor BCS",
  eid: "982 000364507221",
  eid2: "",
  otherId: "SBR-3309",
  lifetimeId: "SBR25-3309",
  breed: "Angus",
  weight: "1,187",
  memo: "Good disposition, easy handler. Spring calving group.",
};

const calvingHistory = [
  { date: "Mar 22, 2025", calfTag: "8841", calfSex: "Bull", birthWeight: "85 lbs", calfSize: 3, assistance: "None", notes: "Normal birth — strong calf" },
  { date: "Apr 8, 2024", calfTag: "7503", calfSex: "Heifer", birthWeight: "72 lbs", calfSize: 2, assistance: "None", notes: "Normal birth" },
  { date: "Mar 30, 2023", calfTag: "6218", calfSex: "Bull", birthWeight: "90 lbs", calfSize: 4, assistance: "Easy pull", notes: "Slight assistance needed, large calf" },
];

const treatmentHistory = [
  { date: "Nov 10, 2025", product: "Penicillin G", dosage: "10 mL", route: "IM", reason: "Respiratory — mild", withdrawalDate: "Dec 10, 2025", resolvedDate: "Nov 18, 2025" },
  { date: "Aug 5, 2025", product: "Banamine", dosage: "20 mL", route: "IV", reason: "Foot rot", withdrawalDate: "Aug 9, 2025", resolvedDate: "Aug 14, 2025" },
];

const workHistory = [
  {
    date: "Feb 24, 2026", project: "Spring Preg Check", weight: "1,187", preg: "Confirmed",
    notes: "Weight recorded — healthy, good condition", flag: "teal" as FlagColor | null,
    treatments: [{ name: "Multimin 90", dosage: "12 mL", route: "SQ" }],
  },
  {
    date: "Jan 14, 2026", project: "Winter Vaccination", weight: "1,165", preg: null,
    notes: "Routine vaccination, good body condition", flag: null,
    treatments: [
      { name: "Bovi-Shield Gold 5", dosage: "2 mL", route: "IM" },
      { name: "Ivermectin Pour-On", dosage: "55 mL", route: "Topical" },
    ],
  },
  {
    date: "Oct 15, 2025", project: "Fall Processing", weight: "1,152", preg: "Confirmed",
    notes: "Pour-on dewormer applied, weaned calf #8841", flag: null,
    treatments: [{ name: "Dectomax Pour-On", dosage: "50 mL", route: "Topical" }],
  },
];

const weightHistory = [
  { weight: "1,187", date: "Feb 24, 2026", project: "Spring Preg Check", note: "Good condition" },
  { weight: "1,165", date: "Jan 14, 2026", project: "Winter Vaccination", note: "" },
  { weight: "1,152", date: "Oct 15, 2025", project: "Fall Processing", note: "" },
  { weight: "1,120", date: "May 22, 2025", project: "Spring Preg Check 2025", note: "" },
  { weight: "1,098", date: "Nov 3, 2024", project: "Fall Processing 2024", note: "" },
];

const idHistory = [
  { field: "Tag changed", oldNew: "3108 → 3309", date: "Feb 24, 2026", changedBy: "J. Olson" },
  { field: "Tag Color changed", oldNew: "Yellow → Pink", date: "Oct 12, 2023", changedBy: "J. Olson" },
  { field: "EID changed", oldNew: "Set to 982 000364507221", date: "Mar 15, 2022", changedBy: "Admin" },
];

export default function AnimalDetailScreen() {
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState<"details" | "history">("details");
  const [fields, setFields] = useState({ ...animalRecord });
  const [memo, setMemo] = useState(animalRecord.memo);
  const [selectedQuickNotes, setSelectedQuickNotes] = useState(["Hard keeper", "Good mother"]);
  const [originalFields] = useState({ ...animalRecord });
  const [originalMemo] = useState(animalRecord.memo);
  const [originalQuickNotes] = useState(["Hard keeper", "Good mother"]);
  const { showToast } = useChuteSideToast();
  const navigate = useNavigate();

  const update = (key: keyof typeof fields) => (val: string) =>
    setFields(prev => ({ ...prev, [key]: val }));

  const handleCancel = () => {
    setFields({ ...originalFields });
    setMemo(originalMemo);
    setSelectedQuickNotes([...originalQuickNotes]);
    setIsEditing(false);
  };

  const handleSave = () => {
    showToast("success", `Animal ${fields.tag} saved`);
    setIsEditing(false);
  };

  const toggleQuickNote = (note: string) => {
    if (!isEditing) return;
    setSelectedQuickNotes(prev =>
      prev.includes(note) ? prev.filter(n => n !== note) : [...prev, note]
    );
  };

  const flagLabel = fields.flag ? FLAG_OPTIONS.find(f => f.color === fields.flag)?.label : null;
  const flagHex = fields.flag ? FLAG_OPTIONS.find(f => f.color === fields.flag)?.hex : null;
  const displayedNotes = selectedQuickNotes.slice(0, 3);
  const moreCount = selectedQuickNotes.length - 3;

  /* ── Field row helper ── */
  const FieldRow = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
      <span style={{ ...LABEL_STYLE, paddingTop: 8 }}>{label}</span>
      {children}
    </div>
  );

  const TextInput = ({ value, onChange, placeholder, readOnly }: { value: string; onChange?: (v: string) => void; placeholder?: string; readOnly?: boolean }) => (
    <input
      type="text"
      value={value}
      onChange={e => onChange?.(e.target.value)}
      placeholder={placeholder}
      readOnly={readOnly || !isEditing}
      style={readOnly || !isEditing ? INPUT_READONLY : INPUT_BASE}
      onFocus={e => { if (isEditing) { e.currentTarget.style.borderColor = "#F3D12A"; e.currentTarget.style.boxShadow = "0 0 0 2px rgba(243,209,42,0.25)"; } }}
      onBlur={e => { e.currentTarget.style.borderColor = "#D4D4D0"; e.currentTarget.style.boxShadow = "none"; }}
    />
  );

  const SelectInput = ({ value, options, onChange, disabled }: { value: string; options: readonly string[]; onChange?: (v: string) => void; disabled?: boolean }) => (
    <select
      value={value}
      onChange={e => onChange?.(e.target.value)}
      disabled={disabled || !isEditing}
      style={{
        ...(disabled || !isEditing ? INPUT_READONLY : INPUT_BASE),
        appearance: "auto" as const,
      }}
      onFocus={e => { if (isEditing) { e.currentTarget.style.borderColor = "#F3D12A"; e.currentTarget.style.boxShadow = "0 0 0 2px rgba(243,209,42,0.25)"; } }}
      onBlur={e => { e.currentTarget.style.borderColor = "#D4D4D0"; e.currentTarget.style.boxShadow = "none"; }}
    >
      {options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  );

  /* ── Navy card helper ── */
  const NavyCard = ({ children }: { children: React.ReactNode }) => (
    <div style={{ borderRadius: 12, padding: "14px 16px", backgroundColor: "#0E2646" }}>
      {children}
    </div>
  );

  const Badge = ({ children, style: s }: { children: React.ReactNode; style?: React.CSSProperties }) => (
    <span style={{
      borderRadius: 9999, fontSize: 10, fontWeight: 700, padding: "2px 8px",
      backgroundColor: "rgba(240,240,240,0.08)", color: "rgba(240,240,240,0.60)", ...s,
    }}>{children}</span>
  );

  /* ═══════ RENDER ═══════ */
  return (
    <div className="px-4 space-y-0 pb-10">
      {/* 1 — GRADIENT HEADER CARD */}
      <div
        style={{
          borderRadius: 16, padding: "20px",
          background: "linear-gradient(145deg, #0E2646 0%, #163A5E 55%, #55BAAA 100%)",
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
          {/* Left */}
          <div style={{ minWidth: 0, flex: 1 }} className="space-y-1.5">
            <div style={{ color: "white", fontSize: 36, fontWeight: 800, lineHeight: 1, letterSpacing: "-0.02em" }}>
              {fields.tag}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 8, height: 8, borderRadius: 9999, backgroundColor: TAG_COLOR_HEX[fields.tagColor] || "#E8A0BF", flexShrink: 0 }} />
              <span style={{ fontSize: 13, fontWeight: 400, color: "rgba(240,240,240,0.45)" }}>
                {fields.tagColor} · {fields.sex} · {fields.animalType} · {fields.yearBorn}
              </span>
            </div>
            <div style={{ fontSize: 11, fontWeight: 500, color: "#A8E6DA" }}>
              {fields.status} · {fields.weight} lbs
            </div>
            {selectedQuickNotes.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, paddingTop: 2 }}>
                {displayedNotes.map(n => (
                  <span key={n} style={{
                    backgroundColor: "rgba(255,255,255,0.10)", color: "rgba(240,240,240,0.80)",
                    fontSize: 10, fontWeight: 600, borderRadius: 9999, padding: "2px 8px",
                  }}>{n}</span>
                ))}
                {moreCount > 0 && (
                  <span style={{ fontSize: 10, fontWeight: 600, color: "rgba(240,240,240,0.40)" }}>+{moreCount}</span>
                )}
              </div>
            )}
          </div>
          {/* Right — flag */}
          {fields.flag && flagHex && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
              <FlagIcon color={fields.flag} size={22} />
              <span style={{ fontSize: 9, fontWeight: 600, color: flagHex }}>{flagLabel}</span>
            </div>
          )}
        </div>
      </div>

      {/* 2 — TAB BAR */}
      <div style={{ display: "flex", gap: 0, marginTop: 10 }}>
        {(["details", "history"] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} type="button" style={{
            flex: 1, padding: "10px 0", fontSize: 13, fontWeight: 700, cursor: "pointer",
            backgroundColor: activeTab === tab ? "#0E2646" : "transparent",
            color: activeTab === tab ? "white" : "rgba(26,26,26,0.40)",
            border: `1px solid ${activeTab === tab ? "transparent" : "#D4D4D0"}`,
            borderRadius: tab === "details" ? "10px 0 0 10px" : "0 10px 10px 0",
          }}>{tab.charAt(0).toUpperCase() + tab.slice(1)}</button>
        ))}
      </div>

      {/* ═══ DETAILS TAB ═══ */}
      {activeTab === "details" && (
        <div className="space-y-3" style={{ paddingTop: 10 }}>
          {/* Edit / Cancel / Save buttons */}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            {isEditing ? (
              <>
                <button onClick={handleCancel} type="button" style={{ padding: "6px 16px", borderRadius: 9999, border: "1px solid #D4D4D0", backgroundColor: "white", fontSize: 12, fontWeight: 600, color: "rgba(26,26,26,0.55)", cursor: "pointer" }}>Cancel</button>
                <button onClick={handleSave} type="button" style={{ padding: "6px 16px", borderRadius: 9999, border: "none", backgroundColor: "#F3D12A", fontSize: 12, fontWeight: 700, color: "#1A1A1A", cursor: "pointer" }}>Save</button>
              </>
            ) : (
              <button onClick={() => setIsEditing(true)} type="button" style={{ padding: "6px 16px", borderRadius: 9999, border: "1px solid #D4D4D0", backgroundColor: "white", fontSize: 12, fontWeight: 600, color: "#0E2646", cursor: "pointer" }}>Edit</button>
            )}
          </div>

          {/* Identity */}
          <CollapsibleSection title="Identity" defaultOpen>
            <div className="space-y-2">
              <FieldRow label="Tag"><TextInput value={fields.tag} onChange={update("tag")} /></FieldRow>
              <FieldRow label="Tag Color"><SelectInput value={fields.tagColor} options={TAG_COLOR_OPTIONS} onChange={update("tagColor")} /></FieldRow>
              <FieldRow label="Sex"><SelectInput value={fields.sex} options={SEX_OPTIONS} onChange={update("sex")} /></FieldRow>
              <FieldRow label="Type"><SelectInput value={fields.animalType} options={ANIMAL_TYPE_OPTIONS} onChange={update("animalType")} /></FieldRow>
              <FieldRow label="Year Born"><SelectInput value={fields.yearBorn} options={YEAR_OPTIONS} onChange={update("yearBorn")} /></FieldRow>
              <FieldRow label="Status"><SelectInput value={fields.status} options={STATUS_OPTIONS} onChange={update("status")} /></FieldRow>
              <FieldRow label="Breed"><TextInput value={fields.breed} onChange={update("breed")} /></FieldRow>
            </div>
          </CollapsibleSection>

          {/* IDs */}
          <CollapsibleSection title="IDs">
            <div className="space-y-2">
              <FieldRow label="EID"><TextInput value={fields.eid} onChange={update("eid")} /></FieldRow>
              <FieldRow label="EID 2"><TextInput value={fields.eid2} onChange={update("eid2")} placeholder="—" /></FieldRow>
              <FieldRow label="Other ID"><TextInput value={fields.otherId} onChange={update("otherId")} /></FieldRow>
              <FieldRow label="Lifetime ID"><TextInput value={fields.lifetimeId} readOnly /></FieldRow>
            </div>
          </CollapsibleSection>

          {/* Quick Notes */}
          <CollapsibleSection title="Quick Notes">
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {quickNoteLabels.map(note => {
                const active = selectedQuickNotes.includes(note);
                return (
                  <button key={note} onClick={() => toggleQuickNote(note)} type="button" style={{
                    borderRadius: 9999, padding: "5px 12px", fontSize: 11, fontWeight: 600,
                    border: active ? "2px solid #0E2646" : "1px solid #D4D4D0",
                    backgroundColor: active ? "#0E2646" : "white",
                    color: active ? "white" : "rgba(26,26,26,0.55)",
                    cursor: isEditing ? "pointer" : "default",
                    opacity: isEditing ? 1 : 0.7,
                  }}>{note}</button>
                );
              })}
            </div>
          </CollapsibleSection>

          {/* Memo */}
          <CollapsibleSection title="Memo">
            <textarea
              value={memo}
              onChange={e => setMemo(e.target.value)}
              readOnly={!isEditing}
              placeholder="Notes about this animal…"
              style={{
                width: "100%", minHeight: 80, resize: "none", borderRadius: 8, padding: "10px 12px",
                fontSize: 16, border: "1px solid #D4D4D0",
                backgroundColor: isEditing ? "#FFFFFF" : "#F3F3F5",
                outline: "none", boxSizing: "border-box",
              }}
              onFocus={e => { if (isEditing) focusGold(e); }}
              onBlur={blurReset}
            />
          </CollapsibleSection>
        </div>
      )}

      {/* ═══ HISTORY TAB ═══ */}
      {activeTab === "history" && (
        <div className="space-y-3" style={{ paddingTop: 10 }}>
          {/* Calving History */}
          <CollapsibleSection title="Calving History" defaultOpen>
            <div className="space-y-2">
              {calvingHistory.map((c, i) => (
                <NavyCard key={i}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 15, fontWeight: 700, color: "white" }}>{c.calfTag}</span>
                      <Badge style={{
                        backgroundColor: c.calfSex === "Bull" ? "rgba(85,186,170,0.15)" : "rgba(232,160,191,0.20)",
                        color: c.calfSex === "Bull" ? "#55BAAA" : "#E8A0BF",
                      }}>{c.calfSex}</Badge>
                    </div>
                    <span style={{ fontSize: 11, color: "rgba(240,240,240,0.35)" }}>{c.date}</span>
                  </div>
                  <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                    <span style={{ fontSize: 11, color: "rgba(240,240,240,0.50)" }}>{c.birthWeight}</span>
                    {c.assistance !== "None" && (
                      <>
                        <span style={{ width: 1, height: 10, backgroundColor: "rgba(255,255,255,0.12)" }} />
                        <span style={{ fontSize: 11, color: "rgba(243,209,42,0.70)" }}>{c.assistance}</span>
                      </>
                    )}
                  </div>
                  {c.notes && <div style={{ fontSize: 11, color: "rgba(240,240,240,0.35)", marginTop: 4 }}>{c.notes}</div>}
                </NavyCard>
              ))}
            </div>
          </CollapsibleSection>

          {/* Cow Work History */}
          <CollapsibleSection title="Cow Work History">
            <div className="space-y-2">
              {workHistory.map((w, i) => (
                <NavyCard key={i}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "white" }}>{w.project}</span>
                    <span style={{ fontSize: 11, color: "rgba(240,240,240,0.35)" }}>{w.date}</span>
                  </div>
                  <div style={{ display: "flex", gap: 8, marginTop: 4, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 11, color: "rgba(240,240,240,0.50)" }}>{w.weight} lbs</span>
                    {w.preg && (
                      <>
                        <span style={{ width: 1, height: 10, backgroundColor: "rgba(255,255,255,0.12)" }} />
                        <span style={{ fontSize: 11, color: "#55BAAA" }}>{w.preg}</span>
                      </>
                    )}
                    {w.flag && (
                      <>
                        <span style={{ width: 1, height: 10, backgroundColor: "rgba(255,255,255,0.12)" }} />
                        <FlagIcon color={w.flag} size={12} />
                      </>
                    )}
                  </div>
                  {w.treatments.length > 0 && (
                    <div style={{ marginTop: 6, display: "flex", flexWrap: "wrap", gap: 4 }}>
                      {w.treatments.map((t, j) => (
                        <span key={j} style={{ fontSize: 9, fontWeight: 600, padding: "2px 6px", borderRadius: 9999, backgroundColor: "rgba(85,186,170,0.12)", color: "#55BAAA" }}>
                          {t.name} · {t.dosage} · {t.route}
                        </span>
                      ))}
                    </div>
                  )}
                  {w.notes && <div style={{ fontSize: 11, color: "rgba(240,240,240,0.35)", marginTop: 4 }}>{w.notes}</div>}
                </NavyCard>
              ))}
            </div>
          </CollapsibleSection>

          {/* Treatment History */}
          <CollapsibleSection title="Treatment History">
            <div className="space-y-2">
              {treatmentHistory.map((t, i) => (
                <NavyCard key={i}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "white" }}>{t.product}</span>
                    <span style={{ fontSize: 11, color: "rgba(240,240,240,0.35)" }}>{t.date}</span>
                  </div>
                  <div style={{ display: "flex", gap: 8, marginTop: 4, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 11, color: "rgba(240,240,240,0.50)" }}>{t.dosage} · {t.route}</span>
                    <span style={{ width: 1, height: 10, backgroundColor: "rgba(255,255,255,0.12)" }} />
                    <span style={{ fontSize: 11, color: "rgba(240,240,240,0.50)" }}>{t.reason}</span>
                  </div>
                </NavyCard>
              ))}
            </div>
          </CollapsibleSection>

          {/* Weight History */}
          <CollapsibleSection title="Weight History">
            <div className="space-y-2">
              {weightHistory.map((w, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0", borderBottom: i < weightHistory.length - 1 ? "1px solid rgba(212,212,208,0.40)" : "none" }}>
                  <div>
                    <span style={{ fontSize: 15, fontWeight: 700, color: "#1A1A1A" }}>{w.weight} lbs</span>
                    {w.note && <span style={{ fontSize: 11, color: "rgba(26,26,26,0.40)", marginLeft: 8 }}>{w.note}</span>}
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 11, color: "rgba(26,26,26,0.55)" }}>{w.project}</div>
                    <div style={{ fontSize: 10, color: "rgba(26,26,26,0.30)" }}>{w.date}</div>
                  </div>
                </div>
              ))}
            </div>
          </CollapsibleSection>

          {/* ID History */}
          <CollapsibleSection title="ID History">
            <div className="space-y-2">
              {idHistory.map((h, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: i < idHistory.length - 1 ? "1px solid rgba(212,212,208,0.40)" : "none" }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#1A1A1A" }}>{h.field}</div>
                    <div style={{ fontSize: 11, color: "rgba(26,26,26,0.50)" }}>{h.oldNew}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 11, color: "rgba(26,26,26,0.40)" }}>{h.date}</div>
                    <div style={{ fontSize: 10, color: "rgba(26,26,26,0.30)" }}>{h.changedBy}</div>
                  </div>
                </div>
              ))}
            </div>
          </CollapsibleSection>
        </div>
      )}
    </div>
  );
}
