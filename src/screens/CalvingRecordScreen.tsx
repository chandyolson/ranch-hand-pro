import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import CollapsibleSection from "../components/CollapsibleSection";
import FlagIcon from "../components/FlagIcon";
import { useChuteSideToast } from "../components/ToastContext";

/* ── Types ── */
interface CalvingRecord {
  id: string;
  date: string;
  group: string;
  location: string;
  damTag: string;
  damColor: string;
  damColorHex: string;
  damType: string;
  damYearBorn: string;
  damFlag: "teal" | "gold" | "red" | null;
  calfTag: string;
  calfColor: string;
  calfColorHex: string;
  calfEid: string;
  calfSex: "Bull" | "Heifer" | "Unknown";
  calfStatus: "Alive" | "Dead";
  birthWeight: string;
  calfSize: string;
  sire: string;
  disposition: string;
  assistance: string;
  udder: string;
  teat: string;
  claw: string;
  foot: string;
  mothering: string;
  calfVigor: string;
  quickNotes: string[];
  memo: string;
}

/* ── Mock data ── */
const calvingRecords: Record<string, CalvingRecord> = {
  c1: {
    id: "c1", date: "2026-03-08", group: "Spring Calvers", location: "Calving Barn",
    damTag: "3309", damColor: "Pink", damColorHex: "#E8A0BF", damType: "Cow", damYearBorn: "2020", damFlag: "teal",
    calfTag: "8841", calfColor: "Yellow", calfColorHex: "#F3D12A", calfEid: "", calfSex: "Bull", calfStatus: "Alive",
    birthWeight: "85", calfSize: "3", sire: "Bull 101 — Hereford",
    disposition: "2", assistance: "1", udder: "2", teat: "2", claw: "1", foot: "1", mothering: "1",
    calfVigor: "4", quickNotes: ["Good mother"], memo: "Normal birth — strong calf",
  },
  c2: {
    id: "c2", date: "2026-03-07", group: "Spring Calvers", location: "Calving Barn",
    damTag: "4782", damColor: "Yellow", damColorHex: "#F3D12A", damType: "Cow", damYearBorn: "2019", damFlag: null,
    calfTag: "8842", calfColor: "Green", calfColorHex: "#55BAAA", calfEid: "", calfSex: "Heifer", calfStatus: "Alive",
    birthWeight: "72", calfSize: "2", sire: "Unknown",
    disposition: "1", assistance: "1", udder: "1", teat: "1", claw: "1", foot: "1", mothering: "2",
    calfVigor: "3", quickNotes: [], memo: "",
  },
  c3: {
    id: "c3", date: "2026-03-07", group: "Spring Calvers", location: "East Pasture",
    damTag: "5520", damColor: "Green", damColorHex: "#55BAAA", damType: "Cow", damYearBorn: "2018", damFlag: "gold",
    calfTag: "8843", calfColor: "Yellow", calfColorHex: "#F3D12A", calfEid: "", calfSex: "Bull", calfStatus: "Alive",
    birthWeight: "90", calfSize: "4", sire: "Bull 202 — Angus",
    disposition: "3", assistance: "2", udder: "2", teat: "2", claw: "1", foot: "1", mothering: "2",
    calfVigor: "4", quickNotes: [], memo: "Large calf",
  },
  c4: {
    id: "c4", date: "2026-03-06", group: "Spring Calvers", location: "Calving Barn",
    damTag: "2218", damColor: "Orange", damColorHex: "#E8863A", damType: "Cow", damYearBorn: "2017", damFlag: "red",
    calfTag: "8844", calfColor: "Yellow", calfColorHex: "#F3D12A", calfEid: "", calfSex: "Heifer", calfStatus: "Dead",
    birthWeight: "68", calfSize: "2", sire: "Unknown",
    disposition: "4", assistance: "3", udder: "3", teat: "3", claw: "2", foot: "2", mothering: "3",
    calfVigor: "1", quickNotes: [], memo: "Stillborn",
  },
};

const scoreLabels: Record<string, string[]> = {
  disposition: ["","1 — Docile","2 — Restless","3 — Nervous","4 — Flighty","5 — Aggressive","6 — Dangerous"],
  assistance:  ["","1 — None","2 — Easy Pull","3 — Hard Pull","4 — Mech. Assist","5 — C-Section"],
  udder:       ["","1 — Ideal","2 — Acceptable","3 — Functional/Mod","4 — Functional/Serious","5 — Non-functional","6 — Very Non-functional","7 — Hard/Distorted","8 — Non-functional Quarters","9 — Blind Quarters"],
  teat:        ["","1 — Small","2 — Mod. Small","3 — Mod. Large","4 — Large","5 — Very Large","6 — Funnel","7 — Bottle","8 — Inverted","9 — Other"],
  claw:        ["","1 — Ideal","2 — Slight Deviation","3 — Mod. Deviation","4 — Severe Deviation"],
  foot:        ["","1 — Ideal","2 — Mod. Issues","3 — Severe Issues","4 — Extreme Issues"],
  mothering:   ["","1 — Excellent","2 — Good","3 — Fair","4 — Poor","5 — Rejected Calf"],
  calfVigor:   ["","1 — Very Weak","2 — Weak","3 — Average","4 — Strong","5 — Very Strong"],
  calfSize:    ["","1 — Small","2 — Mod. Small","3 — Average","4 — Mod. Large","5 — Large"],
};

const flagConfig: Record<string, { label: string; hex: string }> = {
  teal: { label: "Management", hex: "#55BAAA" },
  gold: { label: "Production", hex: "#F3D12A" },
  red:  { label: "Cull", hex: "#9B2335" },
};

const tagColorOptions = ["Pink","Yellow","Orange","Green","Blue","White","Red","Purple","No Tag"];
const tagColorHexMap: Record<string, string> = {
  Pink: "#E8A0BF", Yellow: "#F3D12A", Orange: "#E8863A", Green: "#55BAAA",
  Blue: "#5B8DEF", White: "#E0E0E0", Red: "#D4606E", Purple: "#A77BCA", "No Tag": "#999999",
};
const groupOptions = ["Spring Calvers","Fall Calvers","First Calf Heifers","Replacement Heifers","Mixed"];
const locationOptions = ["Home Place","East Pasture","West Pasture","Calving Barn","Feedlot"];
const sexOptions = ["Bull","Heifer","Unknown"];
const quickNoteOptions = ["Hard keeper","Easy keeper","Good mother","Poor mother","Prolapse history","Foot rot","Lump jaw","Slow breeder","Heavy milker","Light milker"];

/* ── Shared styles ── */
const inputBase: React.CSSProperties = {
  flex: 1, height: 40, borderRadius: 8, paddingLeft: 12, paddingRight: 12,
  fontFamily: "'Inter', sans-serif", fontSize: 16, fontWeight: 400, color: "#1A1A1A", outline: "none",
};
const inputEditing: React.CSSProperties = { ...inputBase, border: "1px solid #D4D4D0", backgroundColor: "white" };
const inputReadOnly: React.CSSProperties = { ...inputBase, border: "1px solid transparent", backgroundColor: "#F5F5F0", cursor: "default" };
const labelStyle: React.CSSProperties = { width: 96, flexShrink: 0, fontSize: 14, fontWeight: 600, color: "#1A1A1A", fontFamily: "'Inter', sans-serif" };
const sectionLabel: React.CSSProperties = { fontSize: 9, fontWeight: 700, letterSpacing: "0.10em", color: "rgba(26,26,26,0.35)", textTransform: "uppercase", fontFamily: "'Inter', sans-serif" };

const focusGold = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
  e.currentTarget.style.borderColor = "#F3D12A";
  e.currentTarget.style.boxShadow = "0 0 0 2px rgba(243,209,42,0.25)";
};
const blurReset = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
  e.currentTarget.style.borderColor = "#D4D4D0";
  e.currentTarget.style.boxShadow = "none";
};

const formatDate = (iso: string) => {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

/* ── Component ── */
export default function CalvingRecordScreen() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useChuteSideToast();

  const record = calvingRecords[id || "c1"] || calvingRecords["c1"];

  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState("record");
  const [fields, setFields] = useState<CalvingRecord>({ ...record });

  const set = <K extends keyof CalvingRecord>(key: K, val: CalvingRecord[K]) =>
    setFields(prev => ({ ...prev, [key]: val }));

  const handleSave = () => {
    showToast("success", "Calving record updated");
    setIsEditing(false);
  };
  const handleCancel = () => {
    setFields({ ...record });
    setIsEditing(false);
  };

  const cowScoreKeys: (keyof CalvingRecord)[] = ["disposition","assistance","udder","teat","claw","foot","mothering"];
  const cowScoreLabelsMap: Record<string, string> = { disposition: "Disposition", assistance: "Assistance", udder: "Udder", teat: "Teat", claw: "Claw", foot: "Foot", mothering: "Mothering" };
  const cowScoreMax: Record<string, number> = { disposition: 6, assistance: 5, udder: 9, teat: 9, claw: 4, foot: 4, mothering: 5 };

  const calfScoreKeys: (keyof CalvingRecord)[] = ["calfVigor", "calfSize"];
  const calfScoreLabelsMap: Record<string, string> = { calfVigor: "Vigor", calfSize: "Calf Size" };
  const calfScoreMax: Record<string, number> = { calfVigor: 5, calfSize: 5 };

  const getStyle = (editing: boolean) => editing ? inputEditing : inputReadOnly;

  const assistanceVal = parseInt(fields.assistance);
  const assistanceLabel = assistanceVal > 1 ? scoreLabels.assistance[assistanceVal] : null;

  return (
    <div className="px-4 space-y-0 pb-10 font-['Inter']">
      {/* GRADIENT HEADER */}
      <div
        className="rounded-2xl mt-3 font-['Inter']"
        style={{ background: "linear-gradient(145deg, #0E2646 0%, #163A5E 55%, #55BAAA 100%)", padding: "16px" }}
      >
        <div className="flex items-start justify-between gap-3">
          {/* Left */}
          <div className="min-w-0 flex-1 space-y-1.5">
            {/* Row 1 — identity */}
            <div className="flex items-center gap-2 flex-wrap">
              <span style={{ fontSize: 24, fontWeight: 800, color: "white", lineHeight: 1, letterSpacing: "-0.02em" }}>{fields.damTag}</span>
              <span style={{ width: 10, height: 10, borderRadius: 9999, backgroundColor: fields.damColorHex, flexShrink: 0 }} />
              <span style={{ fontSize: 14, color: "rgba(240,240,240,0.35)" }}>→</span>
              <span style={{ fontSize: 24, fontWeight: 800, color: "#55BAAA", lineHeight: 1 }}>{fields.calfTag}</span>
            </div>
            {/* Row 2 — event info */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span style={{ fontSize: 12, fontWeight: 500, color: "rgba(240,240,240,0.50)" }}>{formatDate(fields.date)}</span>
              <span style={{ width: 1, height: 10, backgroundColor: "rgba(255,255,255,0.15)", flexShrink: 0 }} />
              <span style={{ fontSize: 12, fontWeight: 500, color: "rgba(168,230,218,0.70)" }}>{fields.group}</span>
              <span style={{ width: 1, height: 10, backgroundColor: "rgba(255,255,255,0.15)", flexShrink: 0 }} />
              <span style={{ fontSize: 12, fontWeight: 500, color: "rgba(168,230,218,0.70)" }}>{fields.location}</span>
            </div>
            {/* Row 3 — badges */}
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              <span
                className="rounded-full"
                style={{
                  fontSize: 9, fontWeight: 700, padding: "2px 8px",
                  backgroundColor: fields.calfSex === "Bull" ? "rgba(85,186,170,0.15)" : "rgba(232,160,191,0.20)",
                  color: fields.calfSex === "Bull" ? "#55BAAA" : "#E8A0BF",
                }}
              >
                {fields.calfSex.toUpperCase()}
              </span>
              {fields.calfStatus === "Dead" && (
                <span className="rounded-full" style={{ fontSize: 9, fontWeight: 700, padding: "2px 8px", backgroundColor: "rgba(155,35,53,0.20)", color: "#D4606E" }}>DEAD</span>
              )}
              {fields.birthWeight && (
                <span className="rounded-full" style={{ fontSize: 9, fontWeight: 700, padding: "2px 8px", backgroundColor: "rgba(255,255,255,0.08)", color: "rgba(240,240,240,0.60)" }}>
                  {fields.birthWeight} lbs
                </span>
              )}
              {assistanceLabel && (
                <span className="rounded-full" style={{ fontSize: 9, fontWeight: 700, padding: "2px 8px", backgroundColor: "rgba(243,209,42,0.12)", color: "#F3D12A" }}>
                  {assistanceLabel}
                </span>
              )}
            </div>
          </div>
          {/* Right — flag */}
          {fields.damFlag && (
            <div className="shrink-0 flex flex-col items-center gap-1 pt-1">
              <FlagIcon color={fields.damFlag} size="md" />
              <span style={{ fontSize: 10, fontWeight: 600, color: flagConfig[fields.damFlag]?.hex, textAlign: "center" }}>
                {flagConfig[fields.damFlag]?.label}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* EDITING BAR */}
      {isEditing && (
        <div className="mx-3 mt-3 rounded-xl px-3 py-2.5 flex items-center justify-between font-['Inter']" style={{ backgroundColor: "#F3D12A" }}>
          <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.10em", color: "#1A1A1A" }}>EDITING</span>
          <div className="flex gap-2">
            <button onClick={handleCancel} className="rounded-full px-4 py-1.5 cursor-pointer font-['Inter']" style={{ border: "1px solid rgba(26,26,26,0.20)", background: "transparent", fontSize: 12, fontWeight: 600, color: "#1A1A1A" }}>Cancel</button>
            <button onClick={handleSave} className="rounded-full px-4 py-1.5 cursor-pointer font-['Inter']" style={{ backgroundColor: "#0E2646", border: "none", fontSize: 12, fontWeight: 700, color: "white" }}>Save</button>
          </div>
        </div>
      )}

      {/* Tab bar */}
      <div className="flex mx-3 mt-3 gap-0 border-b font-['Inter']" style={{ borderColor: "rgba(212,212,208,0.60)" }}>
        {[
          { key: "record", label: "Record" },
          { key: "dam", label: "Dam History" },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => {
              if (tab.key === "dam") navigate("/animals/" + fields.damTag);
              else setActiveTab("record");
            }}
            className="px-4 py-2.5 cursor-pointer transition-all active:scale-[0.97]"
            style={{
              fontSize: 13,
              fontWeight: activeTab === tab.key ? 700 : 500,
              color: activeTab === tab.key ? "#0E2646" : "rgba(26,26,26,0.40)",
              background: "transparent",
              border: "none",
              borderBottom: activeTab === tab.key ? "2px solid #F3D12A" : "2px solid transparent",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* CONTENT */}
      <div className="px-3 mt-3 space-y-3">
        {/* CALVING INFO */}
        <div className="rounded-xl border font-['Inter']" style={{ borderColor: "rgba(212,212,208,0.60)", backgroundColor: "white", padding: "14px 10px" }}>
          <div className="flex items-center justify-between mb-2">
            <span style={sectionLabel}>CALVING INFO</span>
            {!isEditing && (
              <button onClick={() => setIsEditing(true)} className="rounded-full px-3 py-1 cursor-pointer active:scale-[0.97] font-['Inter']" style={{ backgroundColor: "#F3D12A", border: "none", fontSize: 11, fontWeight: 700, color: "#1A1A1A" }}>Edit</button>
            )}
          </div>
          <div className="space-y-2">
            {/* Date */}
            <div className="flex items-center gap-2">
              <span style={labelStyle}>Date</span>
              <input type="date" value={fields.date} onChange={e => set("date", e.target.value)} readOnly={!isEditing} style={getStyle(isEditing)} onFocus={isEditing ? focusGold : undefined} onBlur={isEditing ? blurReset : undefined} />
            </div>
            {/* Dam Tag */}
            <div>
              <div className="flex items-center gap-2">
                <span style={labelStyle}>Dam Tag</span>
                <input type="text" value={fields.damTag} onChange={e => set("damTag", e.target.value)} readOnly={!isEditing} style={getStyle(isEditing)} onFocus={isEditing ? focusGold : undefined} onBlur={isEditing ? blurReset : undefined} />
              </div>
              <div className="flex items-center gap-1.5" style={{ marginLeft: 104, marginTop: 2 }}>
                <span style={{ width: 8, height: 8, borderRadius: 9999, backgroundColor: fields.damColorHex, flexShrink: 0 }} />
                <span style={{ fontSize: 11, color: "rgba(26,26,26,0.40)", fontFamily: "'Inter', sans-serif" }}>{fields.damColor} · {fields.damType} · {fields.damYearBorn}</span>
              </div>
            </div>
            {/* Group */}
            <div className="flex items-center gap-2">
              <span style={labelStyle}>Group</span>
              {isEditing ? (
                <select value={fields.group} onChange={e => set("group", e.target.value)} style={{ ...inputEditing, appearance: "auto" as const }} onFocus={focusGold} onBlur={blurReset}>
                  {groupOptions.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              ) : (
                <div style={inputReadOnly}><span style={{ lineHeight: "40px" }}>{fields.group}</span></div>
              )}
            </div>
            {/* Location */}
            <div className="flex items-center gap-2">
              <span style={labelStyle}>Location</span>
              {isEditing ? (
                <select value={fields.location} onChange={e => set("location", e.target.value)} style={{ ...inputEditing, appearance: "auto" as const }} onFocus={focusGold} onBlur={blurReset}>
                  {locationOptions.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              ) : (
                <div style={inputReadOnly}><span style={{ lineHeight: "40px" }}>{fields.location}</span></div>
              )}
            </div>
          </div>
        </div>

        {/* CALF INFO */}
        <div className="rounded-xl border font-['Inter']" style={{ borderColor: "rgba(212,212,208,0.60)", backgroundColor: "white", padding: "14px 10px" }}>
          <div style={{ ...sectionLabel, marginBottom: 8 }}>CALF INFO</div>
          <div className="space-y-2">
            {/* Calf Tag */}
            <div className="flex items-center gap-2">
              <span style={labelStyle}>Calf Tag</span>
              <input type="text" value={fields.calfTag} onChange={e => set("calfTag", e.target.value)} readOnly={!isEditing} style={getStyle(isEditing)} onFocus={isEditing ? focusGold : undefined} onBlur={isEditing ? blurReset : undefined} />
            </div>
            {/* Tag Color */}
            <div className="flex items-center gap-2">
              <span style={labelStyle}>Tag Color</span>
              {isEditing ? (
                <div className="relative flex-1">
                  <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", width: 8, height: 8, borderRadius: 9999, backgroundColor: tagColorHexMap[fields.calfColor] || "#999", zIndex: 1 }} />
                  <select value={fields.calfColor} onChange={e => set("calfColor", e.target.value)} style={{ ...inputEditing, flex: "unset", width: "100%", paddingLeft: 28, appearance: "auto" as const }} onFocus={focusGold} onBlur={blurReset}>
                    {tagColorOptions.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
              ) : (
                <div style={inputReadOnly} className="flex items-center gap-2">
                  <span style={{ width: 8, height: 8, borderRadius: 9999, backgroundColor: tagColorHexMap[fields.calfColor] || "#999", flexShrink: 0 }} />
                  <span>{fields.calfColor}</span>
                </div>
              )}
            </div>
            {/* Calf EID */}
            <div className="flex items-center gap-2">
              <span style={labelStyle}>Calf EID</span>
              <input type="text" value={fields.calfEid} onChange={e => set("calfEid", e.target.value)} readOnly={!isEditing} placeholder="None recorded" style={getStyle(isEditing)} onFocus={isEditing ? focusGold : undefined} onBlur={isEditing ? blurReset : undefined} />
            </div>
            {/* Sex */}
            <div className="flex items-center gap-2">
              <span style={labelStyle}>Sex</span>
              {isEditing ? (
                <select value={fields.calfSex} onChange={e => set("calfSex", e.target.value as CalvingRecord["calfSex"])} style={{ ...inputEditing, appearance: "auto" as const }} onFocus={focusGold} onBlur={blurReset}>
                  {sexOptions.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              ) : (
                <div style={inputReadOnly}><span style={{ lineHeight: "40px" }}>{fields.calfSex}</span></div>
              )}
            </div>
            {/* Sire */}
            <div className="flex items-center gap-2">
              <span style={labelStyle}>Sire</span>
              <input type="text" value={fields.sire} onChange={e => set("sire", e.target.value)} readOnly={!isEditing} style={getStyle(isEditing)} onFocus={isEditing ? focusGold : undefined} onBlur={isEditing ? blurReset : undefined} />
            </div>
            {/* Wt / Size */}
            <div>
              <div className="flex items-center gap-2">
                <span style={labelStyle}>Wt / Size</span>
                <input type="number" value={fields.birthWeight} onChange={e => set("birthWeight", e.target.value)} readOnly={!isEditing} placeholder="lbs" style={getStyle(isEditing)} onFocus={isEditing ? focusGold : undefined} onBlur={isEditing ? blurReset : undefined} />
                <span style={{ color: "rgba(26,26,26,0.25)", fontFamily: "'Inter', sans-serif", margin: "0 2px" }}>/</span>
                <input type="number" min={1} max={5} value={fields.calfSize} onChange={e => set("calfSize", e.target.value)} readOnly={!isEditing} placeholder="1–5" style={{ ...getStyle(isEditing), flex: "unset", width: 72 }} onFocus={isEditing ? focusGold : undefined} onBlur={isEditing ? blurReset : undefined} />
              </div>
              {!isEditing && fields.calfSize && scoreLabels.calfSize[parseInt(fields.calfSize)] && (
                <div style={{ marginLeft: 104, fontSize: 11, color: "rgba(26,26,26,0.40)", marginTop: 2, fontFamily: "'Inter', sans-serif" }}>
                  {scoreLabels.calfSize[parseInt(fields.calfSize)]}
                </div>
              )}
            </div>
            {/* Status */}
            <div className="flex items-center gap-2">
              <span style={labelStyle}>Status</span>
              <div className="flex gap-2 flex-1">
                {(["Alive", "Dead"] as const).map(s => {
                  const active = fields.calfStatus === s;
                  const bg = active ? (s === "Alive" ? "#0E2646" : "#9B2335") : "transparent";
                  const color = active ? "white" : (s === "Alive" ? "#0E2646" : "#9B2335");
                  const border = active ? bg : (s === "Alive" ? "rgba(14,38,70,0.25)" : "rgba(155,35,53,0.30)");
                  return (
                    <button
                      key={s}
                      onClick={() => isEditing && set("calfStatus", s)}
                      className="rounded-full flex-1 font-['Inter']"
                      style={{ height: 40, border: `1px solid ${border}`, backgroundColor: bg, fontSize: 14, fontWeight: 700, color, cursor: isEditing ? "pointer" : "default" }}
                    >
                      {s}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* COW TRAIT SCORES */}
        <CollapsibleSection
          title="Cow Trait Scores"
          defaultOpen={false}
          collapsedContent={
            <div className="flex flex-wrap gap-1.5 pt-2">
              {cowScoreKeys.filter(k => fields[k]).length === 0 ? (
                <span style={{ fontSize: 12, color: "rgba(26,26,26,0.35)", fontFamily: "'Inter', sans-serif" }}>No scores recorded</span>
              ) : (
                cowScoreKeys.filter(k => fields[k]).map(k => {
                  const val = parseInt(fields[k] as string);
                  const label = scoreLabels[k]?.[val] || `${val}`;
                  return (
                    <span key={k} className="rounded-full" style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", backgroundColor: "rgba(14,38,70,0.06)", color: "#0E2646" }}>
                      {cowScoreLabelsMap[k]} {label}
                    </span>
                  );
                })
              )}
            </div>
          }
        >
          <div className="space-y-3 pt-1">
            {cowScoreKeys.map(k => (
              <ScoreField key={k} label={cowScoreLabelsMap[k]} value={fields[k] as string} max={cowScoreMax[k]} labels={scoreLabels[k]} isEditing={isEditing} onChange={v => set(k, v)} />
            ))}
          </div>
        </CollapsibleSection>

        {/* CALF TRAIT SCORES */}
        <CollapsibleSection
          title="Calf Trait Scores"
          defaultOpen={false}
          collapsedContent={
            <div className="flex flex-wrap gap-1.5 pt-2">
              {calfScoreKeys.filter(k => fields[k]).length === 0 ? (
                <span style={{ fontSize: 12, color: "rgba(26,26,26,0.35)", fontFamily: "'Inter', sans-serif" }}>No scores recorded</span>
              ) : (
                calfScoreKeys.filter(k => fields[k]).map(k => {
                  const val = parseInt(fields[k] as string);
                  const label = scoreLabels[k]?.[val] || `${val}`;
                  return (
                    <span key={k} className="rounded-full" style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", backgroundColor: "rgba(14,38,70,0.06)", color: "#0E2646" }}>
                      {calfScoreLabelsMap[k]} {label}
                    </span>
                  );
                })
              )}
            </div>
          }
        >
          <div className="space-y-3 pt-1">
            {calfScoreKeys.map(k => (
              <ScoreField key={k} label={calfScoreLabelsMap[k]} value={fields[k] as string} max={calfScoreMax[k]} labels={scoreLabels[k]} isEditing={isEditing} onChange={v => set(k, v)} />
            ))}
          </div>
        </CollapsibleSection>

        {/* NOTES */}
        <div className="rounded-xl border font-['Inter']" style={{ borderColor: "rgba(212,212,208,0.60)", backgroundColor: "white", padding: "14px 10px" }}>
          <div style={{ ...sectionLabel, marginBottom: 8 }}>NOTES</div>
          {/* Quick notes */}
          <div className="flex flex-wrap gap-2 mb-3">
            {isEditing ? (
              quickNoteOptions.map(n => {
                const active = fields.quickNotes.includes(n);
                return (
                  <button
                    key={n}
                    onClick={() => set("quickNotes", active ? fields.quickNotes.filter(x => x !== n) : [...fields.quickNotes, n])}
                    className="rounded-full cursor-pointer active:scale-[0.96] font-['Inter']"
                    style={{
                      padding: "6px 12px", fontSize: 13, fontWeight: 600, border: "none",
                      backgroundColor: active ? "#0E2646" : "rgba(14,38,70,0.06)",
                      color: active ? "white" : "#0E2646",
                    }}
                  >
                    {n}
                  </button>
                );
              })
            ) : (
              fields.quickNotes.length === 0 ? (
                <span style={{ fontSize: 13, color: "rgba(26,26,26,0.35)", fontFamily: "'Inter', sans-serif" }}>None</span>
              ) : (
                fields.quickNotes.map(n => (
                  <span key={n} className="rounded-full font-['Inter']" style={{ padding: "6px 12px", fontSize: 13, fontWeight: 600, backgroundColor: "#0E2646", color: "white" }}>{n}</span>
                ))
              )
            )}
          </div>
          {/* Memo */}
          <div style={{ ...sectionLabel, marginBottom: 6 }}>MEMO</div>
          {isEditing ? (
            <textarea
              value={fields.memo}
              onChange={e => set("memo", e.target.value)}
              placeholder="Notes about this record…"
              className="font-['Inter']"
              style={{
                width: "100%", minHeight: 64, resize: "none", borderRadius: 8, padding: "10px 12px",
                backgroundColor: "#F5F5F0", border: "1px solid #D4D4D0", fontSize: 16, fontWeight: 400,
                color: "#1A1A1A", outline: "none", fontFamily: "'Inter', sans-serif",
              }}
              onFocus={focusGold}
              onBlur={blurReset}
            />
          ) : (
            fields.memo ? (
              <p style={{ fontSize: 14, color: "#1A1A1A", lineHeight: 1.5, fontFamily: "'Inter', sans-serif", margin: 0 }}>{fields.memo}</p>
            ) : (
              <span style={{ fontSize: 13, color: "rgba(26,26,26,0.35)", fontFamily: "'Inter', sans-serif" }}>None</span>
            )
          )}
        </div>

        {/* Bottom actions */}
        <div className="flex gap-3 pt-2 pb-6 font-['Inter']">
          <button
            onClick={handleCancel}
            className="flex-1 rounded-full py-3.5 border border-[#D4D4D0] bg-white font-['Inter'] cursor-pointer active:scale-[0.97] transition-all"
            style={{ fontSize: 14, fontWeight: 600, color: "#0E2646" }}
          >
            Reset
          </button>
          <button
            onClick={() => {
              if (isEditing) {
                showToast("success", "Record saved");
                setIsEditing(false);
              }
              navigate("/calving/new");
            }}
            className="flex-[2] rounded-full py-3.5 bg-[#F3D12A] font-['Inter'] cursor-pointer active:scale-[0.97] transition-all"
            style={{ fontSize: 14, fontWeight: 700, color: "#1A1A1A", border: "none" }}
          >
            Save &amp; New
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Score Field sub-component ── */
function ScoreField({ label, value, max, labels, isEditing, onChange }: {
  label: string; value: string; max: number; labels: string[]; isEditing: boolean; onChange: (v: string) => void;
}) {
  return (
    <div>
      <div className="flex items-start gap-2">
        <span style={{ ...labelStyle, paddingTop: 8 }}>{label}</span>
        {isEditing ? (
          <select
            value={value}
            onChange={e => onChange(e.target.value)}
            style={{ ...inputEditing, appearance: "auto" as const }}
            onFocus={focusGold}
            onBlur={blurReset}
          >
            <option value="">Select 1–{max}</option>
            {Array.from({ length: max }, (_, i) => (
              <option key={i + 1} value={String(i + 1)}>{i + 1}</option>
            ))}
          </select>
        ) : (
          <div style={{ ...inputReadOnly, display: "flex", alignItems: "center" }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: "#1A1A1A" }}>{(value && labels[parseInt(value)]) || value || "—"}</span>
          </div>
        )}
      </div>
      {isEditing && value && labels[parseInt(value)] && (
        <div style={{ marginLeft: 104, fontSize: 11, color: "rgba(26,26,26,0.40)", marginTop: 2, fontFamily: "'Inter', sans-serif" }}>
          {labels[parseInt(value)]}
        </div>
      )}
    </div>
  );
}
