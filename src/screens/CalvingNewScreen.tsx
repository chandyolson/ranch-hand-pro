import { useState } from "react";
import { useNavigate } from "react-router-dom";
import CollapsibleSection from "../components/CollapsibleSection";
import FlagIcon from "../components/FlagIcon";
import { useChuteSideToast } from "../components/ToastContext";

/* ── Mock data ── */
const damLookupResult = {
  tag: "3309",
  tagColor: "Pink",
  tagColorHex: "#E8A0BF",
  type: "Cow",
  yearBorn: "2020",
  flag: "teal" as const,
  flagLabel: "Management",
  flagReason: "Spring calving group — monitor BCS",
  quickNotes: ["Hard keeper", "Good mother"],
  recentCalvings: [
    { calfTag: "8841", calfSex: "Bull",   date: "Mar 22, 2025", birthWeight: "85 lbs",  assistance: "None" },
    { calfTag: "7503", calfSex: "Heifer", date: "Apr 8, 2024",  birthWeight: "72 lbs",  assistance: "None" },
    { calfTag: "6218", calfSex: "Bull",   date: "Mar 30, 2023", birthWeight: "90 lbs",  assistance: "Easy pull" },
  ],
  workHistory: [
    { project: "Spring Preg Check 2026", date: "Feb 24, 2026", weight: "1,187", preg: "Confirmed" },
    { project: "Winter Vaccination 2026", date: "Jan 14, 2026", weight: "1,165", preg: "Confirmed" },
  ],
  activeTreatments: [] as string[],
};

const tagColorOptions = ["Pink","Yellow","Orange","Green","Blue","White","Red","Purple","No Tag"];
const tagColorHexMap: Record<string, string> = {
  Pink: "#E8A0BF", Yellow: "#F3D12A", Orange: "#E8863A", Green: "#55BAAA",
  Blue: "#5B8DEF", White: "#E0E0E0", Red: "#D4606E", Purple: "#A77BCA", "No Tag": "#999999",
};
const groupOptions = ["Spring Calvers", "Fall Calvers", "First Calf Heifers", "Replacement Heifers", "Mixed"];
const locationOptions = ["Home Place", "East Pasture", "West Pasture", "Feedlot", "Calving Barn"];
const sexOptions = ["Bull", "Heifer", "Unknown"];
const sireOptions = ["Unknown", "Bull 101 — Hereford", "Bull 202 — Angus", "Bull 303 — Simmental"];
const calfSizeLabels = ["", "1 — Small", "2 — Mod. Small", "3 — Average", "4 — Mod. Large", "5 — Large"];
const assistanceLabels = ["", "1 — None", "2 — Easy Pull", "3 — Hard Pull", "4 — Mech. Assist", "5 — C-Section"];
const dispositionLabels = ["", "1 — Docile", "2 — Restless", "3 — Nervous", "4 — Flighty", "5 — Aggressive", "6 — Dangerous"];
const udderLabels = ["", "1 — Ideal", "2 — Acceptable", "3 — Functional/Mod Issues", "4 — Functional/Serious Issues", "5 — Non-functional", "6 — Very Non-functional", "7 — Hard/Grossly Distorted", "8 — Non-functional Quarters", "9 — Blind Quarters"];
const teatLabels = ["", "1 — Small", "2 — Mod. Small", "3 — Mod. Large", "4 — Large", "5 — Very Large", "6 — Funnel", "7 — Bottle", "8 — Inverted", "9 — Other"];
const clawLabels = ["", "1 — Ideal", "2 — Slight Deviation", "3 — Mod. Deviation", "4 — Severe Deviation"];
const footLabels = ["", "1 — Ideal", "2 — Mod. Issues", "3 — Severe Issues", "4 — Extreme Issues"];
const motheringLabels = ["", "1 — Excellent", "2 — Good", "3 — Fair", "4 — Poor", "5 — Rejected Calf"];
const vigorLabels = ["", "1 — Very Weak", "2 — Weak", "3 — Average", "4 — Strong", "5 — Very Strong"];
const quickNoteOptions = ["Hard keeper","Easy keeper","Good mother","Poor mother","Prolapse history","Foot rot","Lump jaw","Slow breeder","Heavy milker","Light milker"];

/* ── Shared styles ── */
const inputStyle: React.CSSProperties = {
  flex: 1, height: 40, borderRadius: 8, border: "1px solid #D4D4D0",
  backgroundColor: "white", paddingLeft: 12, paddingRight: 12,
  fontFamily: "'Inter', sans-serif", fontSize: 16, fontWeight: 400,
  color: "#1A1A1A", outline: "none",
};
const labelStyle: React.CSSProperties = {
  width: 105, flexShrink: 0, fontSize: 14, fontWeight: 600, color: "#1A1A1A",
  fontFamily: "'Inter', sans-serif",
};
const sectionLabel: React.CSSProperties = {
  fontSize: 9, fontWeight: 700, letterSpacing: "0.10em", color: "rgba(26,26,26,0.35)",
  textTransform: "uppercase", marginBottom: 4, fontFamily: "'Inter', sans-serif",
};
const cardStyle = "rounded-xl font-['Inter']";

const FieldRow = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="flex items-center gap-3">
    <span style={labelStyle}>{label}</span>
    {children}
  </div>
);

const ScoreRow = ({ label, value, onChange, max, labels }: { label: string; value: string; onChange: (v: string) => void; max: number; labels: string[] }) => (
  <div>
    <div className="flex items-center gap-3">
      <span style={labelStyle}>{label}</span>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{ ...inputStyle, appearance: "auto" as const }}
        onFocus={e => { e.currentTarget.style.borderColor = "#F3D12A"; e.currentTarget.style.boxShadow = "0 0 0 2px rgba(243,209,42,0.25)"; }}
        onBlur={e => { e.currentTarget.style.borderColor = "#D4D4D0"; e.currentTarget.style.boxShadow = "none"; }}
      >
        <option value="">Select 1–{max}</option>
        {Array.from({ length: max }, (_, i) => (
          <option key={i + 1} value={String(i + 1)}>{i + 1}</option>
        ))}
      </select>
    </div>
    {value && labels[parseInt(value)] && (
      <div style={{ marginLeft: 117, fontSize: 11, color: "rgba(26,26,26,0.40)", marginTop: 2, fontFamily: "'Inter', sans-serif" }}>
        {labels[parseInt(value)]}
      </div>
    )}
  </div>
);

export default function CalvingNewScreen() {
  const [activeTab, setActiveTab] = useState<"entry" | "dam">("entry");

  // Calving Info
  const [date, setDate] = useState("2026-03-09");
  const [damTag, setDamTag] = useState("3309");
  const [isDamMatched, setIsDamMatched] = useState(true);
  const [group, setGroup] = useState("Spring Calvers");
  const [location, setLocation] = useState("Calving Barn");

  // Calf Info
  const [calfTag, setCalfTag] = useState("");
  const [calfColor, setCalfColor] = useState("Yellow");
  const [calfEid, setCalfEid] = useState("");
  const [calfSex, setCalfSex] = useState("");
  const [sire, setSire] = useState("");
  const [birthWeight, setBirthWeight] = useState("");
  const [calfSize, setCalfSize] = useState("");
  const [calfStatus, setCalfStatus] = useState<"Alive" | "Dead">("Alive");

  // Scores
  const [disposition, setDisposition] = useState("");
  const [assistance, setAssistance] = useState("");
  const [udder, setUdder] = useState("");
  const [teat, setTeat] = useState("");
  const [claw, setClaw] = useState("");
  const [foot, setFoot] = useState("");
  const [mothering, setMothering] = useState("");
  const [calfVigor, setCalfVigor] = useState("");

  // Notes
  const [selectedQuickNotes, setSelectedQuickNotes] = useState<string[]>([]);
  const [memo, setMemo] = useState("");

  // Dam tab
  const [damFlag, setDamFlag] = useState<"teal" | "gold" | "red" | null>("teal");
  const [damFlagReason, setDamFlagReason] = useState("Spring calving group — monitor BCS");
  const [damQuickNotes, setDamQuickNotes] = useState(["Hard keeper", "Good mother"]);
  const [damMemo, setDamMemo] = useState("");

  const { showToast } = useChuteSideToast();
  const navigate = useNavigate();

  const clearForm = () => {
    setCalfTag(""); setCalfColor("Yellow"); setCalfEid("");
    setCalfSex(""); setSire(""); setBirthWeight("");
    setCalfSize(""); setCalfStatus("Alive");
    setDisposition(""); setAssistance(""); setUdder(""); setTeat("");
    setClaw(""); setFoot(""); setMothering(""); setCalfVigor("");
    setSelectedQuickNotes([]); setMemo("");
  };

  const handleSave = () => {
    if (!damTag.trim()) { showToast("error", "Dam tag required"); return; }
    if (!calfTag.trim()) { showToast("error", "Calf tag required"); return; }
    const msg = calfStatus === "Dead"
      ? `Calving record saved — calf ${calfTag} marked Dead`
      : `Calving record saved — calf ${calfTag} added to herd`;
    showToast("success", msg);
    clearForm();
    setDamTag("");
    setIsDamMatched(false);
    setActiveTab("entry");
  };

  const cowScoresSet = [disposition, assistance, udder, teat, claw, foot, mothering].filter(Boolean);
  const calfScoresSet = [calfVigor].filter(Boolean);

  const focusGold = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    e.currentTarget.style.borderColor = "#F3D12A";
    e.currentTarget.style.boxShadow = "0 0 0 2px rgba(243,209,42,0.25)";
  };
  const blurReset = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    e.currentTarget.style.borderColor = "#D4D4D0";
    e.currentTarget.style.boxShadow = "none";
  };

  return (
    <div className="space-y-0 pb-10 font-['Inter']">
      {/* TAB BAR */}
      <div className="flex items-center border-b mb-4" style={{ borderColor: "rgba(212,212,208,0.50)" }}>
        {(["entry", "dam"] as const).map(tab => {
          const isActive = activeTab === tab;
          let tabLabel = tab === "entry" ? "Entry" : isDamMatched ? `Dam · ${damTag}` : "Dam";
          const tabColor = tab === "dam" && !isDamMatched
            ? "rgba(26,26,26,0.25)"
            : isActive ? "#0E2646" : "rgba(26,26,26,0.35)";
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className="flex-1 relative cursor-pointer"
              style={{
                paddingBottom: 12, background: "none", border: "none",
                fontFamily: "'Inter', sans-serif", fontSize: 14,
                fontWeight: isActive ? 700 : 500, color: tabColor,
              }}
            >
              {tabLabel}
              {isActive && (
                <span style={{
                  position: "absolute", bottom: 0, left: "50%", transform: "translateX(-50%)",
                  width: 48, height: 3, borderRadius: 9999, backgroundColor: "#F3D12A",
                }} />
              )}
            </button>
          );
        })}
      </div>

      {activeTab === "entry" ? (
        <div className="space-y-3">
          {/* CALVING INFO */}
          <div className={`${cardStyle} border px-4 py-4 space-y-2`} style={{ backgroundColor: "white", borderColor: "rgba(212,212,208,0.60)" }}>
            <div style={sectionLabel}>CALVING INFO</div>

            <FieldRow label="Date">
              <input type="date" value={date} onChange={e => setDate(e.target.value)} style={inputStyle} onFocus={focusGold} onBlur={blurReset} />
            </FieldRow>

            {/* Dam Tag */}
            <div>
              <div className="flex items-center gap-3">
                <span style={labelStyle}>Dam Tag</span>
                <div className="flex items-center gap-2 flex-1">
                  <input
                    type="text"
                    value={damTag}
                    onChange={e => { setDamTag(e.target.value); setIsDamMatched(false); }}
                    placeholder="Tag or EID…"
                    style={{ ...inputStyle, borderWidth: 2, borderColor: "#F3D12A" }}
                    onFocus={e => { e.currentTarget.style.boxShadow = "0 0 0 2px rgba(243,209,42,0.25)"; }}
                    onBlur={e => { e.currentTarget.style.boxShadow = "none"; }}
                  />
                  <button
                    onClick={() => showToast("info", "Connect EID wand to scan")}
                    className="flex items-center justify-center shrink-0 active:scale-[0.97]"
                    style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: "rgba(14,38,70,0.06)", border: "1px solid rgba(14,38,70,0.10)", cursor: "pointer" }}
                  >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="1" y="3" width="2" height="10" rx="0.5" fill="#0E2646"/><rect x="4" y="1" width="1.5" height="14" rx="0.5" fill="#0E2646"/><rect x="7" y="4" width="2" height="8" rx="0.5" fill="#0E2646"/><rect x="10.5" y="2" width="1.5" height="12" rx="0.5" fill="#0E2646"/><rect x="13" y="3" width="2" height="10" rx="0.5" fill="#0E2646"/></svg>
                  </button>
                </div>
              </div>
              {/* Match indicators */}
              {isDamMatched && (
                <div
                  className="flex items-center gap-1.5 mt-1 cursor-pointer"
                  style={{ marginLeft: 117 }}
                  onClick={() => setActiveTab("dam")}
                >
                  <span style={{ width: 8, height: 8, borderRadius: 9999, backgroundColor: "#55BAAA", flexShrink: 0 }} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: "#55BAAA" }}>
                    {damLookupResult.tag} — {damLookupResult.tagColor} {damLookupResult.type} {damLookupResult.yearBorn} · {damLookupResult.flagLabel} Flag
                  </span>
                </div>
              )}
              {!isDamMatched && damTag.length >= 3 && (
                <div className="flex items-center gap-1.5 mt-1" style={{ marginLeft: 117 }}>
                  <span style={{ width: 8, height: 8, borderRadius: 9999, backgroundColor: "#E87461", flexShrink: 0 }} />
                  <span style={{ fontSize: 13, fontWeight: 500, color: "#E87461" }}>No match — </span>
                  <button
                    onClick={() => showToast("info", "Quick-Add Dam: enter tag, color, and estimated year")}
                    style={{ fontSize: 13, fontWeight: 600, color: "#F3D12A", background: "none", border: "none", cursor: "pointer", padding: 0, fontFamily: "'Inter', sans-serif" }}
                  >
                    Quick-Add Dam
                  </button>
                </div>
              )}
            </div>

            <FieldRow label="Group">
              <select value={group} onChange={e => setGroup(e.target.value)} style={{ ...inputStyle, appearance: "auto" as const }} onFocus={focusGold} onBlur={blurReset}>
                <option value="">Select group</option>
                {groupOptions.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </FieldRow>

            <FieldRow label="Location">
              <select value={location} onChange={e => setLocation(e.target.value)} style={{ ...inputStyle, appearance: "auto" as const }} onFocus={focusGold} onBlur={blurReset}>
                <option value="">Optional</option>
                {locationOptions.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </FieldRow>
          </div>

          {/* CALF INFO */}
          <div className={`${cardStyle} border px-4 py-4 space-y-2`} style={{ backgroundColor: "white", borderColor: "rgba(212,212,208,0.60)" }}>
            <div style={sectionLabel}>CALF INFO</div>

            <FieldRow label="Calf Tag">
              <input type="text" value={calfTag} onChange={e => setCalfTag(e.target.value)} placeholder="New calf tag" style={inputStyle} onFocus={focusGold} onBlur={blurReset} />
            </FieldRow>

            <FieldRow label="Tag Color">
              <div className="relative flex-1">
                <span
                  style={{
                    position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)",
                    width: 8, height: 8, borderRadius: 9999, backgroundColor: tagColorHexMap[calfColor] || "#999",
                    zIndex: 1,
                  }}
                />
                <select
                  value={calfColor}
                  onChange={e => setCalfColor(e.target.value)}
                  style={{ ...inputStyle, flex: "unset", width: "100%", paddingLeft: 28, appearance: "auto" as const }}
                  onFocus={focusGold} onBlur={blurReset}
                >
                  {tagColorOptions.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
            </FieldRow>

            <FieldRow label="Calf EID">
              <input type="text" value={calfEid} onChange={e => setCalfEid(e.target.value)} placeholder="Optional" style={inputStyle} onFocus={focusGold} onBlur={blurReset} />
            </FieldRow>

            <FieldRow label="Sex">
              <select value={calfSex} onChange={e => setCalfSex(e.target.value)} style={{ ...inputStyle, appearance: "auto" as const }} onFocus={focusGold} onBlur={blurReset}>
                <option value="">Select…</option>
                {sexOptions.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </FieldRow>

            <FieldRow label="Sire">
              <select value={sire} onChange={e => setSire(e.target.value)} style={{ ...inputStyle, appearance: "auto" as const }} onFocus={focusGold} onBlur={blurReset}>
                <option value="">Select or search…</option>
                {sireOptions.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </FieldRow>

            {/* Wt / Size paired row */}
            <div>
              <div className="flex items-center gap-3">
                <span style={labelStyle}>Wt / Size</span>
                <input
                  type="number"
                  value={birthWeight}
                  onChange={e => setBirthWeight(e.target.value)}
                  placeholder="lbs"
                  style={{ ...inputStyle }}
                  onFocus={focusGold} onBlur={blurReset}
                />
                <span style={{ color: "rgba(26,26,26,0.25)", fontFamily: "'Inter', sans-serif", margin: "0 2px" }}>/</span>
                <input
                  type="number"
                  min={1} max={5}
                  value={calfSize}
                  onChange={e => setCalfSize(e.target.value)}
                  placeholder="1–5"
                  style={{ ...inputStyle, flex: "unset", width: 72 }}
                  onFocus={focusGold} onBlur={blurReset}
                />
              </div>
              {calfSize && calfSizeLabels[parseInt(calfSize)] && (
                <div style={{ marginLeft: 117, fontSize: 11, color: "rgba(26,26,26,0.40)", marginTop: 2, fontFamily: "'Inter', sans-serif" }}>
                  {calfSizeLabels[parseInt(calfSize)]}
                </div>
              )}
            </div>

            {/* Status toggle */}
            <FieldRow label="Status">
              <div className="flex gap-2 flex-1">
                {(["Alive", "Dead"] as const).map(s => {
                  const isActive = calfStatus === s;
                  const activeBg = s === "Dead" ? "#9B2335" : "#0E2646";
                  const activeBorder = s === "Dead" ? "#9B2335" : "#0E2646";
                  return (
                    <button
                      key={s}
                      onClick={() => setCalfStatus(s)}
                      className="flex-1 rounded-lg font-['Inter'] cursor-pointer transition-all"
                      style={{
                        height: 40, fontSize: 14, fontWeight: 700,
                        backgroundColor: isActive ? activeBg : "white",
                        color: isActive ? "white" : "rgba(26,26,26,0.40)",
                        border: `1px solid ${isActive ? activeBorder : "#D4D4D0"}`,
                      }}
                    >
                      {s}
                    </button>
                  );
                })}
              </div>
            </FieldRow>
          </div>

          {/* COW TRAIT SCORES */}
          <CollapsibleSection
            title="Cow Trait Scores"
            defaultOpen={false}
            collapsedContent={
              cowScoresSet.length > 0 ? (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {disposition && <span className="rounded-full px-2.5 py-0.5" style={{ fontSize: 11, fontWeight: 600, backgroundColor: "rgba(14,38,70,0.08)", color: "#0E2646" }}>Disp: {disposition}</span>}
                  {assistance && <span className="rounded-full px-2.5 py-0.5" style={{ fontSize: 11, fontWeight: 600, backgroundColor: "rgba(14,38,70,0.08)", color: "#0E2646" }}>Assist: {assistance}</span>}
                  {udder && <span className="rounded-full px-2.5 py-0.5" style={{ fontSize: 11, fontWeight: 600, backgroundColor: "rgba(14,38,70,0.08)", color: "#0E2646" }}>Udder: {udder}</span>}
                  {teat && <span className="rounded-full px-2.5 py-0.5" style={{ fontSize: 11, fontWeight: 600, backgroundColor: "rgba(14,38,70,0.08)", color: "#0E2646" }}>Teat: {teat}</span>}
                  {claw && <span className="rounded-full px-2.5 py-0.5" style={{ fontSize: 11, fontWeight: 600, backgroundColor: "rgba(14,38,70,0.08)", color: "#0E2646" }}>Claw: {claw}</span>}
                  {foot && <span className="rounded-full px-2.5 py-0.5" style={{ fontSize: 11, fontWeight: 600, backgroundColor: "rgba(14,38,70,0.08)", color: "#0E2646" }}>Foot: {foot}</span>}
                  {mothering && <span className="rounded-full px-2.5 py-0.5" style={{ fontSize: 11, fontWeight: 600, backgroundColor: "rgba(14,38,70,0.08)", color: "#0E2646" }}>Mother: {mothering}</span>}
                </div>
              ) : (
                <span style={{ fontSize: 12, color: "rgba(26,26,26,0.35)", fontFamily: "'Inter', sans-serif" }}>Tap to record scores</span>
              )
            }
          >
            <div className="space-y-2 pt-2">
              <ScoreRow label="Disposition" value={disposition} onChange={setDisposition} max={6} labels={dispositionLabels} />
              <ScoreRow label="Assistance" value={assistance} onChange={setAssistance} max={5} labels={assistanceLabels} />
              <ScoreRow label="Udder" value={udder} onChange={setUdder} max={9} labels={udderLabels} />
              <ScoreRow label="Teat" value={teat} onChange={setTeat} max={9} labels={teatLabels} />
              <ScoreRow label="Claw" value={claw} onChange={setClaw} max={4} labels={clawLabels} />
              <ScoreRow label="Foot" value={foot} onChange={setFoot} max={4} labels={footLabels} />
              <ScoreRow label="Mothering" value={mothering} onChange={setMothering} max={5} labels={motheringLabels} />
            </div>
          </CollapsibleSection>

          {/* CALF TRAIT SCORES */}
          <CollapsibleSection
            title="Calf Trait Scores"
            defaultOpen={false}
            collapsedContent={
              calfScoresSet.length > 0 ? (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {calfVigor && <span className="rounded-full px-2.5 py-0.5" style={{ fontSize: 11, fontWeight: 600, backgroundColor: "rgba(14,38,70,0.08)", color: "#0E2646" }}>Vigor: {calfVigor}</span>}
                </div>
              ) : (
                <span style={{ fontSize: 12, color: "rgba(26,26,26,0.35)", fontFamily: "'Inter', sans-serif" }}>Tap to record scores</span>
              )
            }
          >
            <div className="space-y-2 pt-2">
              <ScoreRow label="Vigor" value={calfVigor} onChange={setCalfVigor} max={5} labels={vigorLabels} />
              <div className="flex items-center gap-3">
                <span style={labelStyle}>Calf Size</span>
                <div style={{ flex: 1, fontSize: 14, fontWeight: 600, color: calfSize ? "#1A1A1A" : "rgba(26,26,26,0.35)", fontFamily: "'Inter', sans-serif" }}>
                  {calfSize ? `${calfSize} — ${calfSizeLabels[parseInt(calfSize)]?.split(" — ")[1] || ""}` : "Set in Calf Info above"}
                </div>
              </div>
            </div>
          </CollapsibleSection>

          {/* NOTES */}
          <div className={`${cardStyle} border px-4 py-4 space-y-2`} style={{ backgroundColor: "white", borderColor: "rgba(212,212,208,0.60)" }}>
            <div style={sectionLabel}>NOTES</div>

            <div className="flex items-center justify-between mb-2">
              <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.08em", color: "rgba(26,26,26,0.35)", textTransform: "uppercase" }}>QUICK NOTES</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {quickNoteOptions.map(note => {
                const sel = selectedQuickNotes.includes(note);
                return (
                  <button
                    key={note}
                    onClick={() => setSelectedQuickNotes(prev => sel ? prev.filter(n => n !== note) : [...prev, note])}
                    className="rounded-full font-['Inter'] cursor-pointer transition-all active:scale-[0.96]"
                    style={{
                      padding: "6px 12px", fontSize: 13,
                      fontWeight: sel ? 700 : 500,
                      backgroundColor: sel ? "#0E2646" : "white",
                      color: sel ? "white" : "rgba(26,26,26,0.50)",
                      border: `1px solid ${sel ? "#0E2646" : "#D4D4D0"}`,
                    }}
                  >
                    {note}
                  </button>
                );
              })}
            </div>

            <div style={{ marginTop: 12 }}>
              <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.08em", color: "rgba(26,26,26,0.40)", textTransform: "uppercase", marginBottom: 6 }}>MEMO</div>
              <textarea
                value={memo}
                onChange={e => setMemo(e.target.value)}
                placeholder="Notes about this calving…"
                className="w-full font-['Inter'] outline-none transition-all"
                style={{
                  minHeight: 56, resize: "none", borderRadius: 8, padding: "10px 12px",
                  backgroundColor: "#F5F5F0", border: "1px solid #D4D4D0", fontSize: 16,
                }}
                onFocus={focusGold} onBlur={blurReset}
              />
            </div>
          </div>

          {/* ACTION BUTTONS */}
          <div className="flex gap-3 pt-1">
            <button
              onClick={clearForm}
              className="flex-1 rounded-full font-['Inter'] cursor-pointer active:scale-[0.97] transition-all"
              style={{ padding: "14px 0", border: "1px solid #D4D4D0", backgroundColor: "white", fontSize: 14, fontWeight: 600, color: "#0E2646" }}
            >
              Reset
            </button>
            <button
              onClick={handleSave}
              className="rounded-full font-['Inter'] cursor-pointer active:scale-[0.97] transition-all"
              style={{ flex: 2, padding: "14px 0", backgroundColor: "#0E2646", border: "none", fontSize: 14, fontWeight: 700, color: "white" }}
            >
              Save & Next
            </button>
          </div>
        </div>
      ) : (
        /* DAM TAB */
        !isDamMatched ? (
          <div className="py-12 text-center space-y-2">
            <svg width="40" height="40" viewBox="0 0 40 40" fill="none" style={{ margin: "0 auto" }}>
              <rect x="12" y="6" width="16" height="28" rx="8" stroke="rgba(26,26,26,0.12)" strokeWidth="2" fill="none" />
              <circle cx="20" cy="14" r="2" fill="rgba(26,26,26,0.12)" />
              <path d="M16 32L14 38M24 32L26 38" stroke="rgba(26,26,26,0.12)" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <div style={{ fontSize: 15, fontWeight: 600, color: "rgba(26,26,26,0.35)" }}>Enter a dam tag on the Entry tab</div>
            <div style={{ fontSize: 13, fontWeight: 400, color: "rgba(26,26,26,0.25)" }}>Dam record will appear here once matched</div>
          </div>
        ) : (
          <div className="space-y-3">
            {/* DAM HEADER */}
            <div
              className="rounded-2xl px-5 py-5 font-['Inter']"
              style={{ background: "linear-gradient(145deg, #0E2646 0%, #163A5E 55%, #55BAAA 100%)" }}
            >
              <div className="flex items-start justify-between gap-3">
                <div style={{ minWidth: 0, flex: 1 }} className="space-y-1.5">
                  <div style={{ fontSize: 36, fontWeight: 800, color: "white", lineHeight: 1, letterSpacing: "-0.02em" }}>
                    {damLookupResult.tag}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span style={{ width: 8, height: 8, borderRadius: 9999, backgroundColor: damLookupResult.tagColorHex, flexShrink: 0 }} />
                    <span style={{ fontSize: 13, fontWeight: 400, color: "rgba(240,240,240,0.45)" }}>
                      {damLookupResult.tagColor} · {damLookupResult.type} · {damLookupResult.yearBorn}
                    </span>
                  </div>
                  <div style={{ fontSize: 11, fontWeight: 500, color: "#A8E6DA" }}>Active · {group}</div>
                  {damQuickNotes.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-0.5">
                      {damQuickNotes.map(n => (
                        <span key={n} style={{
                          backgroundColor: "rgba(255,255,255,0.10)", color: "rgba(240,240,240,0.80)",
                          fontSize: 10, fontWeight: 600, borderRadius: 9999, padding: "2px 8px",
                        }}>{n}</span>
                      ))}
                    </div>
                  )}
                </div>
                {damFlag && (
                  <div className="shrink-0 pt-1 flex flex-col items-center gap-1">
                    <FlagIcon color={damFlag} size="md" />
                    <span style={{
                      fontSize: 10, fontWeight: 600, textAlign: "center",
                      color: damFlag === "teal" ? "#55BAAA" : damFlag === "gold" ? "#F3D12A" : "#9B2335",
                    }}>
                      {damFlag === "teal" ? "Management" : damFlag === "gold" ? "Production" : "Cull"}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* UPDATE DAM */}
            <div className={`${cardStyle} border px-4 py-4 space-y-3`} style={{ backgroundColor: "white", borderColor: "rgba(212,212,208,0.60)" }}>
              <div style={sectionLabel}>UPDATE DAM</div>

              {/* Flag picker */}
              <div className="flex items-center gap-3">
                <span style={labelStyle}>Flag</span>
                <div className="flex flex-row gap-2">
                  {([
                    { color: "teal" as const, label: "Management", hex: "#55BAAA" },
                    { color: "gold" as const, label: "Production", hex: "#F3D12A" },
                    { color: "red" as const, label: "Cull", hex: "#9B2335" },
                  ]).map(opt => {
                    const isActive = damFlag === opt.color;
                    return (
                      <button
                        key={opt.color}
                        type="button"
                        onClick={() => setDamFlag(isActive ? null : opt.color)}
                        className="rounded-full font-['Inter'] cursor-pointer transition-all"
                        style={{
                          padding: "5px 12px", fontSize: 12, fontWeight: 700, whiteSpace: "nowrap",
                          backgroundColor: isActive ? opt.hex : "transparent",
                          color: isActive ? (opt.color === "gold" ? "#1A1A1A" : "white") : opt.hex,
                          border: `1.5px solid ${isActive ? opt.hex : opt.hex + "50"}`,
                        }}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <FieldRow label="Reason">
                <input
                  type="text" value={damFlagReason} onChange={e => setDamFlagReason(e.target.value)}
                  placeholder="Reason for flag" style={inputStyle} onFocus={focusGold} onBlur={blurReset}
                />
              </FieldRow>

              {/* Dam quick notes */}
              <div>
                <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.08em", color: "rgba(26,26,26,0.35)", textTransform: "uppercase", marginBottom: 8 }}>QUICK NOTES</div>
                <div className="flex flex-wrap gap-2">
                  {quickNoteOptions.map(note => {
                    const sel = damQuickNotes.includes(note);
                    return (
                      <button
                        key={note}
                        onClick={() => setDamQuickNotes(prev => sel ? prev.filter(n => n !== note) : [...prev, note])}
                        className="rounded-full font-['Inter'] cursor-pointer transition-all active:scale-[0.96]"
                        style={{
                          padding: "6px 12px", fontSize: 13,
                          fontWeight: sel ? 700 : 500,
                          backgroundColor: sel ? "#0E2646" : "white",
                          color: sel ? "white" : "rgba(26,26,26,0.50)",
                          border: `1px solid ${sel ? "#0E2646" : "#D4D4D0"}`,
                        }}
                      >
                        {note}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Dam memo */}
              <div>
                <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.08em", color: "rgba(26,26,26,0.40)", textTransform: "uppercase", marginBottom: 6 }}>DAM MEMO</div>
                <textarea
                  value={damMemo}
                  onChange={e => setDamMemo(e.target.value)}
                  placeholder="Notes about this dam…"
                  className="w-full font-['Inter'] outline-none transition-all"
                  style={{
                    minHeight: 56, resize: "none", borderRadius: 8, padding: "10px 12px",
                    backgroundColor: "#F5F5F0", border: "1px solid #D4D4D0", fontSize: 16,
                  }}
                  onFocus={focusGold} onBlur={blurReset}
                />
              </div>
            </div>

            <div style={{ fontSize: 11, color: "rgba(26,26,26,0.30)", fontStyle: "italic", fontFamily: "'Inter', sans-serif" }}>
              Flag and note changes save to dam's record when calving record is saved.
            </div>

            {/* DAM CALVING HISTORY */}
            <CollapsibleSection
              title={`Calving History (${damLookupResult.recentCalvings.length})`}
              defaultOpen={false}
              collapsedContent={
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {damLookupResult.recentCalvings.map(c => (
                    <span key={c.calfTag} className="rounded-full px-2.5 py-0.5" style={{
                      fontSize: 11, fontWeight: 600, backgroundColor: "rgba(243,209,42,0.12)", color: "#F3D12A",
                    }}>
                      {c.calfTag} · {c.calfSex.slice(0, 1)} · {c.date.split(" ")[0]}
                    </span>
                  ))}
                </div>
              }
            >
              <div className="space-y-2 pt-2">
                {damLookupResult.recentCalvings.map(c => (
                  <div key={c.calfTag} className="rounded-xl px-4 py-3" style={{ backgroundColor: "#0E2646" }}>
                    <div className="flex items-center gap-2">
                      <span style={{ fontSize: 14, fontWeight: 700, color: "white" }}>Calf {c.calfTag}</span>
                      <span className="rounded-full" style={{
                        fontSize: 10, fontWeight: 700, padding: "2px 8px",
                        backgroundColor: c.calfSex === "Bull" ? "rgba(85,186,170,0.15)" : "rgba(232,160,191,0.20)",
                        color: c.calfSex === "Bull" ? "#55BAAA" : "#E8A0BF",
                      }}>
                        {c.calfSex.toUpperCase()}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-1" style={{ fontSize: 11, color: "rgba(240,240,240,0.35)" }}>
                      <span>{c.date}</span>
                      <span style={{ width: 1, height: 10, backgroundColor: "rgba(255,255,255,0.12)" }} />
                      <span>{c.birthWeight}</span>
                    </div>
                    {c.assistance !== "None" && (
                      <span className="rounded-full inline-block mt-1.5" style={{
                        fontSize: 10, padding: "2px 8px", backgroundColor: "rgba(155,35,53,0.15)", color: "#D4606E",
                      }}>
                        {c.assistance}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </CollapsibleSection>

            {/* DAM WORK HISTORY */}
            <CollapsibleSection
              title={`Work History (${damLookupResult.workHistory.length})`}
              defaultOpen={false}
              collapsedContent={
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {damLookupResult.workHistory.map(w => (
                    <span key={w.project} className="rounded-full px-2.5 py-0.5" style={{
                      fontSize: 11, fontWeight: 600, backgroundColor: "rgba(14,38,70,0.08)", color: "#0E2646",
                    }}>
                      {w.project} · {w.date.split(",")[0]}
                    </span>
                  ))}
                </div>
              }
            >
              <div className="space-y-1.5 pt-2">
                {damLookupResult.workHistory.map(w => (
                  <div key={w.project} className="py-2.5" style={{ borderBottom: "1px solid rgba(26,26,26,0.06)" }}>
                    <div className="flex items-start justify-between">
                      <span style={{ fontSize: 13, fontWeight: 600, color: "#1A1A1A" }}>{w.project}</span>
                      <span style={{ fontSize: 12, color: "rgba(26,26,26,0.40)" }}>{w.date}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5" style={{ fontSize: 12, color: "rgba(26,26,26,0.50)" }}>
                      <span className="rounded-full px-2 py-0.5" style={{ fontSize: 11, fontWeight: 600, backgroundColor: "rgba(14,38,70,0.06)" }}>{w.weight} lbs</span>
                      <span>{w.preg}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CollapsibleSection>
          </div>
        )
      )}
    </div>
  );
}
