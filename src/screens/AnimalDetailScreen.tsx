import { useState } from "react";
import { useNavigate } from "react-router-dom";
import FlagIcon from "../components/FlagIcon";
import CollapsibleSection from "../components/CollapsibleSection";
import PillButton from "../components/PillButton";
import { useChuteSideToast } from "../components/ToastContext";

type FlagColor = "teal" | "gold" | "red";

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
    date: "Jan 14, 2026", project: "Winter Vaccination", weight: "1,165", preg: "Confirmed",
    notes: "Normal — routine vaccination", flag: null,
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

const flagOptions = [
  { color: "teal" as FlagColor, label: "Management", hex: "#55BAAA" },
  { color: "gold" as FlagColor, label: "Production", hex: "#F3D12A" },
  { color: "red" as FlagColor, label: "Cull", hex: "#9B2335" },
];

const tagColorOptions = ["Pink", "Yellow", "Orange", "Green", "Blue", "White", "Red", "Purple", "No Tag"];
const tagColorDots: Record<string, string> = {
  Pink: "#E8A0BF", Yellow: "#F3D12A", Orange: "#E8863A", Green: "#55BAAA",
  Blue: "#5B8DEF", White: "#E0E0E0", Red: "#D4606E", Purple: "#A77BCA", "No Tag": "#999999",
};
const sexOptions = ["Bull", "Cow", "Steer", "Spayed Heifer", "Heifer"];
const typeOptions = ["Calf", "Yearling", "Feeder", "Cow", "Bull", "Replacement Heifer"];
const yearOptions = ["2026", "2025", "2024", "2023", "2022", "2021", "2020", "2019", "2018", "2017", "2016", "2015"];
const statusOptions = ["Active", "Sold", "Dead", "Culled", "Missing"];
const quickNoteOptions = [
  "Docile", "Aggressive", "Flighty", "Hard keeper", "Easy keeper",
  "Good mother", "Poor mother", "Calving ease", "Calving difficulty",
  "Prolapse history", "Foot rot", "Pinkeye", "Lump jaw",
  "Slow breeder", "Heavy milker", "Light milker",
];

/* ── Shared inline styles ── */
const inputBase: React.CSSProperties = {
  flex: 1, height: 40, borderRadius: 8, border: "1px solid #D4D4D0",
  paddingLeft: 12, paddingRight: 12, fontFamily: "'Inter', sans-serif",
  fontSize: 16, fontWeight: 400, color: "#1A1A1A", outline: "none",
  backgroundColor: "white",
};
const inputReadOnly: React.CSSProperties = { ...inputBase, backgroundColor: "#F5F5F0", cursor: "default" };
const labelStyle: React.CSSProperties = {
  flexShrink: 0, width: 96, fontSize: 14, fontWeight: 600, color: "#1A1A1A",
  fontFamily: "'Inter', sans-serif", paddingTop: 8,
};
const subLabel: React.CSSProperties = {
  fontSize: 9, fontWeight: 700, letterSpacing: "0.08em", color: "rgba(26,26,26,0.35)",
  textTransform: "uppercase" as const, marginBottom: 8, fontFamily: "'Inter', sans-serif",
};

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

  const flagLabel = fields.flag ? flagOptions.find(f => f.color === fields.flag)?.label : null;
  const flagHex = fields.flag ? flagOptions.find(f => f.color === fields.flag)?.hex : null;
  const displayedNotes = selectedQuickNotes.slice(0, 3);
  const moreCount = selectedQuickNotes.length - 3;

  /* ── Field row helper ── */
  const FieldRow = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
      <span style={labelStyle}>{label}</span>
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
      style={readOnly || !isEditing ? inputReadOnly : inputBase}
      onFocus={e => { if (isEditing) { e.currentTarget.style.borderColor = "#F3D12A"; e.currentTarget.style.boxShadow = "0 0 0 2px rgba(243,209,42,0.25)"; } }}
      onBlur={e => { e.currentTarget.style.borderColor = "#D4D4D0"; e.currentTarget.style.boxShadow = "none"; }}
    />
  );

  const SelectInput = ({ value, options, onChange, disabled }: { value: string; options: string[]; onChange?: (v: string) => void; disabled?: boolean }) => (
    <select
      value={value}
      onChange={e => onChange?.(e.target.value)}
      disabled={disabled || !isEditing}
      style={{
        ...(disabled || !isEditing ? inputReadOnly : inputBase),
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
    <div style={{ borderRadius: 12, padding: "14px 16px", backgroundColor: "#0E2646", fontFamily: "'Inter', sans-serif" }}>
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
    <div className="space-y-0 pb-10">
      {/* 1 — GRADIENT HEADER CARD */}
      <div
        style={{
          borderRadius: 16, padding: "20px", fontFamily: "'Inter', sans-serif",
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
              <span style={{ width: 8, height: 8, borderRadius: 9999, backgroundColor: tagColorDots[fields.tagColor] || "#E8A0BF", flexShrink: 0 }} />
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
                  <span style={{
                    backgroundColor: "rgba(255,255,255,0.10)", color: "rgba(240,240,240,0.80)",
                    fontSize: 10, fontWeight: 600, borderRadius: 9999, padding: "2px 8px",
                  }}>+{moreCount} more</span>
                )}
              </div>
            )}
          </div>
          {/* Right — flag */}
          {fields.flag && (
            <div style={{ flexShrink: 0, paddingTop: 4, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
              <FlagIcon color={fields.flag} size="md" />
              {flagLabel && (
                <span style={{ fontSize: 10, fontWeight: 600, color: flagHex || "#55BAAA", textAlign: "center" }}>
                  {flagLabel}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 2 — EDITING GOLD BAR */}
      {isEditing && (
        <div
          style={{
            width: "100%", padding: "10px 16px", display: "flex", alignItems: "center",
            justifyContent: "space-between", fontFamily: "'Inter', sans-serif",
            backgroundColor: "#F3D12A", borderRadius: 12, marginTop: 12,
          }}
        >
          <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.10em", color: "#1A1A1A" }}>EDITING</span>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={handleCancel}
              className="active:scale-[0.97]"
              style={{
                borderRadius: 9999, padding: "6px 16px", border: "1px solid rgba(26,26,26,0.20)",
                backgroundColor: "transparent", cursor: "pointer", fontFamily: "'Inter', sans-serif",
                fontSize: 12, fontWeight: 600, color: "#1A1A1A",
              }}
            >Cancel</button>
            <button
              onClick={handleSave}
              className="active:scale-[0.97]"
              style={{
                borderRadius: 9999, padding: "6px 16px", backgroundColor: "#0E2646",
                border: "none", cursor: "pointer", fontFamily: "'Inter', sans-serif",
                fontSize: 12, fontWeight: 700, color: "white",
              }}
            >Save</button>
          </div>
        </div>
      )}

      {/* 3 — MEMO CARD */}
      <div
        style={{
          marginTop: 12, backgroundColor: "white", borderRadius: 12,
          border: "1px solid rgba(212,212,208,0.60)", padding: "14px 12px",
          fontFamily: "'Inter', sans-serif",
        }}
      >
        <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.08em", color: "rgba(26,26,26,0.40)", textTransform: "uppercase" }}>
          MEMO
        </div>
        <textarea
          value={memo}
          onChange={e => setMemo(e.target.value)}
          readOnly={!isEditing}
          style={{
            width: "100%", minHeight: 64, resize: "none", borderRadius: 8,
            padding: "10px 12px", fontFamily: "'Inter', sans-serif", outline: "none",
            backgroundColor: "#F5F5F0", border: "1px solid #D4D4D0",
            fontSize: 16, fontWeight: 400, color: "#1A1A1A", lineHeight: 1.5,
            marginTop: 6, cursor: isEditing ? "text" : "default",
            transition: "all 150ms",
          }}
          onFocus={e => {
            if (isEditing) {
              e.currentTarget.style.borderColor = "#F3D12A";
              e.currentTarget.style.boxShadow = "0 0 0 2px rgba(243,209,42,0.25)";
            }
          }}
          onBlur={e => {
            e.currentTarget.style.borderColor = "#D4D4D0";
            e.currentTarget.style.boxShadow = "none";
          }}
        />
      </div>

      {/* 4 — TAB BAR */}
      <div style={{ marginTop: 16, display: "flex", alignItems: "center", borderBottom: "1px solid rgba(212,212,208,0.50)" }}>
        {(["details", "history"] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              flex: 1, paddingBottom: 12, cursor: "pointer", background: "none", border: "none",
              fontFamily: "'Inter', sans-serif", fontSize: 14, position: "relative",
              fontWeight: activeTab === tab ? 700 : 500,
              color: activeTab === tab ? "#0E2646" : "rgba(26,26,26,0.35)",
              transition: "color 150ms",
            }}
          >
            {tab === "details" ? "Details" : "History"}
            {activeTab === tab && (
              <span style={{
                position: "absolute", bottom: 0, left: "50%", transform: "translateX(-50%)",
                width: 48, height: 3, borderRadius: 9999, backgroundColor: "#F3D12A",
              }} />
            )}
          </button>
        ))}
        {!isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="active:scale-[0.97]"
            style={{
              flexShrink: 0, borderRadius: 9999, padding: "6px 16px", marginBottom: 10,
              alignSelf: "flex-end", cursor: "pointer", border: "none",
              backgroundColor: "#F3D12A", fontFamily: "'Inter', sans-serif",
              fontSize: 12, fontWeight: 700, color: "#1A1A1A", transition: "all 150ms",
            }}
          >Edit</button>
        )}
      </div>

      {/* 5 — TAB CONTENT */}
      <div style={{ paddingTop: 20 }} className="space-y-3">
        {activeTab === "details" ? (
          <>
            {/* ── EDIT DETAILS ── */}
            <CollapsibleSection
              title="Edit Details"
              defaultOpen={false}
              collapsedContent={
                <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, fontWeight: 500, color: "rgba(26,26,26,0.40)" }} className="truncate">
                  {fields.tag} · {fields.tagColor} · {fields.status} · {fields.flag ? flagOptions.find(f => f.color === fields.flag)?.label : "No Flag"}
                </div>
              }
            >
              <div className="space-y-1.5" style={{ paddingTop: 8 }}>
                {/* IDENTITY */}
                <div>
                  <div style={subLabel}>IDENTITY</div>
                  <div className="space-y-1.5">
                    <div>
                      <FieldRow label="Tag">
                        <TextInput value={fields.tag} onChange={update("tag")} />
                      </FieldRow>
                      {isEditing && (
                        <div style={{ marginLeft: 104, fontSize: 11, color: "rgba(26,26,26,0.35)", fontStyle: "italic", marginTop: 2, fontFamily: "'Inter', sans-serif" }}>
                          Changing tag auto-archives previous identity
                        </div>
                      )}
                    </div>
                    <FieldRow label="Tag Color">
                      <SelectInput value={fields.tagColor} options={tagColorOptions} onChange={update("tagColor")} />
                    </FieldRow>
                    <FieldRow label="EID">
                      <TextInput value={fields.eid} onChange={update("eid")} />
                    </FieldRow>
                    <FieldRow label="Sex">
                      <SelectInput value={fields.sex} options={sexOptions} onChange={update("sex")} />
                    </FieldRow>
                    <FieldRow label="Type">
                      <SelectInput value={fields.animalType} options={typeOptions} onChange={update("animalType")} />
                    </FieldRow>
                    <FieldRow label="Year Born">
                      <SelectInput value={fields.yearBorn} options={yearOptions} onChange={update("yearBorn")} />
                    </FieldRow>
                  </div>
                </div>

                <div style={{ borderTop: "1px solid rgba(26,26,26,0.06)", margin: "8px 0" }} />

                {/* STATUS & FLAG */}
                <div>
                  <div style={subLabel}>STATUS & FLAG</div>
                  <div className="space-y-1.5">
                    <FieldRow label="Status">
                      <SelectInput value={fields.status} options={statusOptions} onChange={update("status")} />
                    </FieldRow>
                    {/* Flag picker */}
                    <div className="flex items-center gap-2 font-['Inter']">
                      <span style={{ width: 96, flexShrink: 0, fontSize: 14, fontWeight: 600, color: "#1A1A1A" }}>
                        Flag
                      </span>
                      <div className="flex flex-row gap-2">
                        {[
                          { color: "teal" as const,  label: "Management", hex: "#55BAAA" },
                          { color: "gold" as const,  label: "Production",  hex: "#F3D12A" },
                          { color: "red"  as const,  label: "Cull",        hex: "#9B2335" },
                        ].map((opt) => {
                          const isActive = fields.flag === opt.color;
                          return (
                            <button
                              key={opt.color}
                              type="button"
                              onClick={() => !isEditing ? undefined : setFields(prev => ({ ...prev, flag: isActive ? null : opt.color }))}
                              className="rounded-full font-['Inter'] transition-all"
                              style={{
                                padding: "5px 12px",
                                fontSize: 12,
                                fontWeight: 700,
                                whiteSpace: "nowrap",
                                cursor: isEditing ? "pointer" : "default",
                                backgroundColor: isActive ? opt.hex : "transparent",
                                color: isActive ? (opt.color === "gold" ? "#1A1A1A" : "white") : opt.hex,
                                border: `1.5px solid ${isActive ? opt.hex : opt.hex + "50"}`,
                                opacity: !isEditing && !isActive ? 0.4 : 1,
                              }}
                            >
                              {opt.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    <FieldRow label="Flag Reason">
                      <TextInput value={fields.flagReason} onChange={update("flagReason")} placeholder="Reason for flag" />
                    </FieldRow>
                  </div>
                </div>

                {isEditing && (
                  <button
                    onClick={handleSave}
                    className="active:scale-[0.97]"
                    style={{
                      marginTop: 12, width: "100%", borderRadius: 9999, padding: "12px 0",
                      backgroundColor: "#0E2646", fontFamily: "'Inter', sans-serif", cursor: "pointer",
                      fontSize: 14, fontWeight: 700, color: "white", border: "none", transition: "all 150ms",
                    }}
                  >Save Changes</button>
                )}
              </div>
            </CollapsibleSection>

            {/* ── QUICK NOTES ── */}
            <CollapsibleSection
              title="Quick Notes"
              defaultOpen={false}
              collapsedContent={
                selectedQuickNotes.length > 0 ? (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, paddingTop: 4 }}>
                    {selectedQuickNotes.map(n => (
                      <span key={n} style={{
                        borderRadius: 9999, padding: "4px 10px", backgroundColor: "#0E2646",
                        color: "white", fontFamily: "'Inter', sans-serif", fontSize: 11, fontWeight: 600,
                      }}>{n}</span>
                    ))}
                  </div>
                ) : (
                  <span style={{ fontSize: 12, color: "rgba(26,26,26,0.40)", fontFamily: "'Inter', sans-serif" }}>None selected</span>
                )
              }
            >
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, paddingTop: 8 }}>
                {quickNoteOptions.map(note => {
                  const sel = selectedQuickNotes.includes(note);
                  return (
                    <button
                      key={note}
                      onClick={() => toggleQuickNote(note)}
                      type="button"
                      className={isEditing && !sel ? "active:scale-[0.96]" : ""}
                      style={{
                        padding: "6px 12px", borderRadius: 9999, fontFamily: "'Inter', sans-serif",
                        fontSize: 13, transition: "all 150ms", border: "1px solid",
                        cursor: isEditing ? "pointer" : "default",
                        ...(sel
                          ? { fontWeight: 700, backgroundColor: "#0E2646", borderColor: "#0E2646", color: "white" }
                          : isEditing
                            ? { fontWeight: 500, backgroundColor: "white", borderColor: "#D4D4D0", color: "#1A1A1A" }
                            : { fontWeight: 500, backgroundColor: "white", borderColor: "#D4D4D0", color: "rgba(26,26,26,0.40)", opacity: 0.6 }
                        ),
                      }}
                    >{note}</button>
                  );
                })}
              </div>
            </CollapsibleSection>

            {/* ── PEDIGREE ── */}
            <CollapsibleSection title="Pedigree" defaultOpen={false}>
              <div className="space-y-3" style={{ paddingTop: 8 }}>
                <FieldRow label="Sire"><TextInput value="" placeholder="Search sire by tag…" /></FieldRow>
                <FieldRow label="Dam"><TextInput value="" placeholder="Search dam by tag…" /></FieldRow>
                <FieldRow label="Reg. Name"><TextInput value="" placeholder="Registration name" /></FieldRow>
                <FieldRow label="Reg. No."><TextInput value="" placeholder="Registration number" /></FieldRow>
              </div>
            </CollapsibleSection>
          </>
        ) : (
          <>
            {/* ═══════ HISTORY TAB ═══════ */}

            {/* ── CALVING RECORDS ── */}
            <CollapsibleSection
              title={`Calving Records (${calvingHistory.length})`}
              defaultOpen={false}
              collapsedContent={
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, paddingTop: 4 }}>
                  {calvingHistory.map(c => (
                    <span key={c.calfTag} style={{
                      borderRadius: 9999, fontSize: 10, fontWeight: 600, padding: "2px 8px",
                      backgroundColor: "rgba(243,209,42,0.12)", color: "#B8960F",
                    }}>{c.calfTag} · {c.calfSex} · {c.date.split(" ")[0]}</span>
                  ))}
                </div>
              }
            >
              <div className="space-y-2" style={{ paddingTop: 8 }}>
                {calvingHistory.map(c => (
                  <NavyCard key={c.calfTag}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                      <span style={{ color: "white", fontSize: 14, fontWeight: 700 }}>Calf {c.calfTag}</span>
                      <span style={{
                        borderRadius: 9999, fontSize: 9, fontWeight: 700, letterSpacing: "0.06em", padding: "2px 8px",
                        backgroundColor: c.calfSex === "Bull" ? "rgba(85,186,170,0.15)" : "rgba(232,160,191,0.20)",
                        color: c.calfSex === "Bull" ? "#55BAAA" : "#E8A0BF",
                      }}>{c.calfSex}</span>
                    </div>
                    <div style={{ fontSize: 11, fontWeight: 500, color: "rgba(240,240,240,0.35)", marginTop: 2 }}>{c.date}</div>
                    <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
                      <Badge>{c.birthWeight}</Badge>
                      <Badge>Calf Size: {c.calfSize}</Badge>
                      <Badge style={c.assistance !== "None" ? { backgroundColor: "rgba(155,35,53,0.15)", color: "#D4606E" } : undefined}>
                        {c.assistance}
                      </Badge>
                    </div>
                    <div style={{ fontSize: 12, color: "rgba(240,240,240,0.45)", lineHeight: 1.4, marginTop: 8 }}>{c.notes}</div>
                  </NavyCard>
                ))}
              </div>
            </CollapsibleSection>

            {/* ── TREATMENTS ── */}
            <CollapsibleSection
              title={`Treatments (${treatmentHistory.length})`}
              defaultOpen={false}
              collapsedContent={
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, paddingTop: 4 }}>
                  {treatmentHistory.map(t => (
                    <span key={t.date} style={{
                      borderRadius: 9999, fontSize: 10, fontWeight: 600, padding: "2px 8px",
                      backgroundColor: "rgba(85,186,170,0.12)", color: "#55BAAA",
                    }}>{t.product}</span>
                  ))}
                </div>
              }
            >
              <div className="space-y-2" style={{ paddingTop: 8 }}>
                {treatmentHistory.map(t => (
                  <NavyCard key={t.date}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                      <span style={{ color: "white", fontSize: 14, fontWeight: 700 }}>{t.product}</span>
                      <span style={{
                        borderRadius: 9999, fontSize: 9, fontWeight: 700, padding: "2px 8px",
                        backgroundColor: "rgba(85,186,170,0.15)", color: "#55BAAA",
                      }}>{t.route}</span>
                    </div>
                    <div style={{ fontSize: 11, color: "rgba(240,240,240,0.35)", marginTop: 2 }}>{t.date}</div>
                    <div style={{ fontSize: 13, color: "rgba(240,240,240,0.55)", marginTop: 2 }}>{t.dosage}</div>
                    <div style={{ fontSize: 12, color: "rgba(240,240,240,0.45)", marginTop: 4 }}>{t.reason}</div>
                    <div style={{ fontSize: 11, color: "rgba(243,209,42,0.70)", marginTop: 4 }}>Withdrawal: {t.withdrawalDate}</div>
                  </NavyCard>
                ))}
              </div>
            </CollapsibleSection>

            {/* ── WORK RECORDS ── */}
            <CollapsibleSection
              title={`Work Records (${workHistory.length})`}
              defaultOpen={false}
              collapsedContent={
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, paddingTop: 4 }}>
                  {workHistory.map(w => (
                    <span key={w.date} style={{
                      borderRadius: 9999, fontSize: 10, fontWeight: 600, padding: "2px 8px",
                      backgroundColor: "rgba(14,38,70,0.08)", color: "#0E2646",
                    }}>{w.project} · {w.date.split(",")[0]}</span>
                  ))}
                </div>
              }
            >
              <div className="space-y-2" style={{ paddingTop: 8 }}>
                {workHistory.map(w => (
                  <NavyCard key={w.date}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                      <span style={{ color: "white", fontSize: 14, fontWeight: 700 }}>{w.project}</span>
                      {w.flag && <FlagIcon color={w.flag} size="sm" />}
                    </div>
                    <div style={{ fontSize: 11, color: "rgba(240,240,240,0.35)", marginTop: 2 }}>{w.date}</div>
                    <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                      <Badge>{w.weight} lbs</Badge>
                      <Badge>Preg: {w.preg}</Badge>
                    </div>
                    <div style={{ fontSize: 12, color: "rgba(240,240,240,0.45)", lineHeight: 1.4, marginTop: 8 }} className="truncate">{w.notes}</div>
                    {w.treatments.length > 0 && (
                      <div style={{ borderTop: "1px solid rgba(240,240,240,0.06)", marginTop: 8, paddingTop: 8 }}>
                        <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.08em", color: "rgba(240,240,240,0.25)", textTransform: "uppercase", marginBottom: 4 }}>TREATMENTS</div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                          {w.treatments.map(tr => (
                            <span key={tr.name} style={{
                              borderRadius: 9999, fontSize: 10, fontWeight: 600, padding: "2px 8px",
                              backgroundColor: "rgba(85,186,170,0.15)", color: "#55BAAA",
                            }}>{tr.name} · {tr.dosage}</span>
                          ))}
                        </div>
                      </div>
                    )}
                  </NavyCard>
                ))}
              </div>
            </CollapsibleSection>

            {/* ── WEIGHT HISTORY ── */}
            <CollapsibleSection
              title="Weight History"
              defaultOpen={false}
              collapsedContent={
                <span style={{
                  borderRadius: 9999, fontSize: 10, fontWeight: 600, padding: "2px 8px",
                  backgroundColor: "rgba(14,38,70,0.08)", color: "#0E2646",
                }}>{weightHistory[0].weight} lbs · {weightHistory[0].date}</span>
              }
            >
              <div style={{ paddingTop: 8 }}>
                {weightHistory.map((w, i) => (
                  <div key={i} style={{
                    display: "flex", alignItems: "flex-start", justifyContent: "space-between",
                    borderBottom: "1px solid rgba(26,26,26,0.06)", padding: "10px 0",
                  }}>
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: "#1A1A1A" }}>{w.weight}</div>
                      <div style={{ fontSize: 12, color: "rgba(26,26,26,0.50)" }}>{w.project}</div>
                      {w.note && <div style={{ fontSize: 12, color: "rgba(26,26,26,0.40)", fontStyle: "italic" }}>{w.note}</div>}
                    </div>
                    <div style={{ flexShrink: 0, textAlign: "right" }}>
                      <div style={{ fontSize: 11, fontWeight: 500, color: "rgba(26,26,26,0.40)" }}>{w.date}</div>
                    </div>
                  </div>
                ))}
                <div style={{ marginTop: 8, fontSize: 11, fontWeight: 600, color: "#55BAAA" }}>
                  +89 lbs over last 12 months
                </div>
              </div>
            </CollapsibleSection>

            {/* ── ID HISTORY ── */}
            <CollapsibleSection
              title="ID History"
              defaultOpen={false}
              collapsedContent={
                <span style={{ fontSize: 12, fontWeight: 500, color: "rgba(26,26,26,0.40)", fontFamily: "'Inter', sans-serif" }}>
                  {idHistory.length} changes recorded
                </span>
              }
            >
              <div style={{ paddingTop: 8 }}>
                {idHistory.map((h, i) => (
                  <div key={i} style={{
                    display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8,
                    borderBottom: "1px solid rgba(26,26,26,0.06)", padding: "10px 0",
                  }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "#1A1A1A" }}>{h.field}</div>
                      <div style={{ fontSize: 12, color: "rgba(26,26,26,0.50)", marginTop: 2 }}>{h.oldNew}</div>
                    </div>
                    <div style={{ flexShrink: 0, textAlign: "right" }}>
                      <div style={{ fontSize: 11, color: "rgba(26,26,26,0.40)" }}>{h.date}</div>
                      <div style={{ fontSize: 11, color: "rgba(26,26,26,0.40)", marginTop: 2 }}>{h.changedBy}</div>
                    </div>
                  </div>
                ))}
                <div style={{ marginTop: 8, fontSize: 11, color: "rgba(26,26,26,0.30)", fontStyle: "italic" }}>
                  ID history is read-only and cannot be deleted.
                </div>
              </div>
            </CollapsibleSection>

            {/* BACK BUTTON */}
            <div style={{ marginTop: 16 }}>
              <PillButton variant="outline" size="md" onClick={() => navigate(-1)} style={{ width: "100%" }}>
                Back to Animals
              </PillButton>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
