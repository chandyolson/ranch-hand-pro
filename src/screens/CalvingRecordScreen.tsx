import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOperation } from "@/contexts/OperationContext";
import CollapsibleSection from "../components/CollapsibleSection";
import FlagIcon from "../components/FlagIcon";
import { useChuteSideToast } from "../components/ToastContext";
import { TAG_COLOR_OPTIONS, TAG_COLOR_HEX, CALF_SEX_OPTIONS, FLAG_OPTIONS, QUICK_NOTES, type FlagColor } from "@/lib/constants";
import { LABEL_STYLE, INPUT_BASE, INPUT_READONLY, SUB_LABEL, focusGold, blurReset } from "@/lib/styles";

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
  damFlag: FlagColor | null;
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

const groupOptions = ["Spring Calvers","Fall Calvers","First Calf Heifers","Replacement Heifers","Mixed"];
const locationOptions = ["Home Place","East Pasture","West Pasture","Calving Barn","Feedlot"];
const calvingSexOptions = [...CALF_SEX_OPTIONS, "Unknown"] as const;
const quickNoteLabels = QUICK_NOTES.map(n => n.label);

const formatDate = (iso: string) => {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

/* ── Component ── */
export default function CalvingRecordScreen() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useChuteSideToast();

  const { operationId } = useOperation();

  const { data: dbRecord, isLoading } = useQuery({
    queryKey: ["calving-record", id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("calving_records")
        .select("*, dam:animals!calving_records_dam_id_fkey(tag, tag_color, sex, type, year_born)")
        .eq("id", id)
        .eq("operation_id", operationId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  // Map database fields to screen display fields
  const dam = dbRecord?.dam as any;
  const record = dbRecord ? {
    id: dbRecord.id,
    date: dbRecord.calving_date,
    group: "",
    location: "",
    damTag: dam?.tag || "Unknown",
    damColor: dam?.tag_color || "None",
    damColorHex: TAG_COLOR_HEX[dam?.tag_color] || "#999",
    damType: dam?.type || dam?.sex || "",
    damYearBorn: dam?.year_born ? String(dam.year_born) : "",
    damFlag: null as FlagColor | null,
    calfTag: "",
    calfColor: "Yellow",
    calfColorHex: "#F3D12A",
    calfEid: "",
    calfSex: (dbRecord.calf_sex || "Unknown") as "Bull" | "Heifer" | "Unknown",
    calfStatus: (dbRecord.calf_status || "Alive") as "Alive" | "Dead",
    birthWeight: dbRecord.birth_weight ? String(dbRecord.birth_weight) : "",
    calfSize: dbRecord.calf_size ? String(dbRecord.calf_size) : "",
    sire: "",
    disposition: dbRecord.disposition ? String(dbRecord.disposition) : "",
    assistance: dbRecord.assistance ? String(dbRecord.assistance) : "",
    udder: dbRecord.udder ? String(dbRecord.udder) : "",
    teat: dbRecord.teat ? String(dbRecord.teat) : "",
    claw: dbRecord.claw ? String(dbRecord.claw) : "",
    foot: dbRecord.foot ? String(dbRecord.foot) : "",
    mothering: dbRecord.mothering ? String(dbRecord.mothering) : "",
    calfVigor: dbRecord.calf_vigor ? String(dbRecord.calf_vigor) : "",
    calfSize2: dbRecord.calf_size ? String(dbRecord.calf_size) : "",
    quickNotes: [] as string[],
    memo: dbRecord.memo || "",
  } : null;

  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState("record");
  const [fields, setFields] = useState<CalvingRecord>({ ...(record || { quickNotes: [], memo: "", damTag: "", damColor: "None", damColorHex: "#999", damType: "", damYearBorn: "", damFlag: null, calfTag: "", calfColor: "Yellow", calfColorHex: "#F3D12A", calfEid: "", calfSex: "Unknown", calfStatus: "Alive", birthWeight: "", calfSize: "", sire: "", disposition: "", assistance: "", udder: "", teat: "", claw: "", foot: "", mothering: "", calfVigor: "", calfSize2: "", date: "", group: "", location: "", id: "" } as CalvingRecord) });

  // Sync fields when record loads from DB
  useEffect(() => {
    if (record) setFields({ ...record });
  }, [dbRecord]);

  const set = <K extends keyof CalvingRecord>(key: K, val: CalvingRecord[K]) =>
    setFields(prev => ({ ...prev, [key]: val }));

  const handleSave = () => {
    showToast("success", "Calving record updated");
    setIsEditing(false);
  };
  const handleCancel = () => {
    if (record) setFields({ ...record });
    setIsEditing(false);
  };

  const cowScoreKeys: (keyof CalvingRecord)[] = ["disposition","assistance","udder","teat","claw","foot","mothering"];
  const cowScoreLabelsMap: Record<string, string> = { disposition: "Disposition", assistance: "Assistance", udder: "Udder", teat: "Teat", claw: "Claw", foot: "Foot", mothering: "Mothering" };
  const cowScoreMax: Record<string, number> = { disposition: 6, assistance: 5, udder: 9, teat: 9, claw: 4, foot: 4, mothering: 5 };

  const calfScoreKeys: (keyof CalvingRecord)[] = ["calfVigor", "calfSize"];
  const calfScoreLabelsMap: Record<string, string> = { calfVigor: "Vigor", calfSize: "Calf Size" };
  const calfScoreMax: Record<string, number> = { calfVigor: 5, calfSize: 5 };

  const getStyle = (editing: boolean) => editing ? INPUT_BASE : INPUT_READONLY;

  const assistanceVal = parseInt(fields.assistance);
  const assistanceLabel = assistanceVal > 1 ? scoreLabels.assistance[assistanceVal] : null;

  const flagInfo = fields.damFlag ? FLAG_OPTIONS.find(f => f.color === fields.damFlag) : null;

  if (isLoading || !record) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh" }}>
        <div style={{
          width: 40, height: 40,
          border: "4px solid #D4D4D0",
          borderTopColor: "#F3D12A",
          borderRadius: "50%",
          animation: "spin 0.8s linear infinite",
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div className="px-4 space-y-0 pb-10">
      {/* GRADIENT HEADER */}
      <div
        className="rounded-2xl mt-3"
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
                {(fields.calfSex || "").toUpperCase()}
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
          {fields.damFlag && flagInfo && (
            <div className="shrink-0 flex flex-col items-center gap-1 pt-1">
              <FlagIcon color={fields.damFlag} size="md" />
              <span style={{ fontSize: 10, fontWeight: 600, color: flagInfo.hex, textAlign: "center" }}>
                {flagInfo.label}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* EDITING BAR */}
      {isEditing && (
        <div className="mt-3 rounded-xl px-3 py-2.5 flex items-center justify-between" style={{ backgroundColor: "#F3D12A" }}>
          <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.10em", color: "#1A1A1A" }}>EDITING</span>
          <div className="flex gap-2">
            <button onClick={handleCancel} className="rounded-full px-4 py-1.5 cursor-pointer" style={{ border: "1px solid rgba(26,26,26,0.20)", background: "transparent", fontSize: 12, fontWeight: 600, color: "#1A1A1A" }}>Cancel</button>
            <button onClick={handleSave} className="rounded-full px-4 py-1.5 cursor-pointer" style={{ backgroundColor: "#0E2646", border: "none", fontSize: 12, fontWeight: 700, color: "white" }}>Save</button>
          </div>
        </div>
      )}

      {/* Tab bar */}
      <div className="flex mt-3 gap-0 border-b" style={{ borderColor: "rgba(212,212,208,0.60)" }}>
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
      <div className="mt-3 space-y-3">
        {/* CALVING INFO */}
        <div className="rounded-xl border" style={{ borderColor: "rgba(212,212,208,0.60)", backgroundColor: "white", padding: "14px 10px" }}>
          <div className="flex items-center justify-between mb-2">
            <span style={SUB_LABEL}>CALVING INFO</span>
            {!isEditing && (
              <button onClick={() => setIsEditing(true)} className="rounded-full px-3 py-1 cursor-pointer active:scale-[0.97]" style={{ backgroundColor: "#F3D12A", border: "none", fontSize: 11, fontWeight: 700, color: "#1A1A1A" }}>Edit</button>
            )}
          </div>
          <div className="space-y-2">
            {/* Date */}
            <div className="flex items-center gap-3 min-w-0">
              <span style={LABEL_STYLE}>Date</span>
              <input type="date" value={fields.date} onChange={e => set("date", e.target.value)} readOnly={!isEditing} style={getStyle(isEditing)} onFocus={isEditing ? focusGold : undefined} onBlur={isEditing ? blurReset : undefined} />
            </div>
            {/* Dam Tag */}
            <div>
              <div className="flex items-center gap-3 min-w-0">
                <span style={LABEL_STYLE}>Dam Tag</span>
                <input type="text" value={fields.damTag} onChange={e => set("damTag", e.target.value)} readOnly={!isEditing} style={getStyle(isEditing)} onFocus={isEditing ? focusGold : undefined} onBlur={isEditing ? blurReset : undefined} />
              </div>
              <div className="flex items-center gap-1.5" style={{ marginLeft: 104, marginTop: 2 }}>
                <span style={{ width: 8, height: 8, borderRadius: 9999, backgroundColor: fields.damColorHex, flexShrink: 0 }} />
                <span style={{ fontSize: 11, color: "rgba(26,26,26,0.40)" }}>{fields.damColor} · {fields.damType} · {fields.damYearBorn}</span>
              </div>
            </div>
            {/* Group */}
            <div className="flex items-center gap-3 min-w-0">
              <span style={LABEL_STYLE}>Group</span>
              {isEditing ? (
                <select value={fields.group} onChange={e => set("group", e.target.value)} style={{ ...INPUT_BASE, appearance: "auto" as const }} onFocus={focusGold} onBlur={blurReset}>
                  {groupOptions.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              ) : (
                <div style={INPUT_READONLY}><span style={{ lineHeight: "40px" }}>{fields.group}</span></div>
              )}
            </div>
            {/* Location */}
            <div className="flex items-center gap-3 min-w-0">
              <span style={LABEL_STYLE}>Location</span>
              {isEditing ? (
                <select value={fields.location} onChange={e => set("location", e.target.value)} style={{ ...INPUT_BASE, appearance: "auto" as const }} onFocus={focusGold} onBlur={blurReset}>
                  {locationOptions.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              ) : (
                <div style={INPUT_READONLY}><span style={{ lineHeight: "40px" }}>{fields.location}</span></div>
              )}
            </div>
          </div>
        </div>

        {/* CALF INFO */}
        <div className="rounded-xl border" style={{ borderColor: "rgba(212,212,208,0.60)", backgroundColor: "white", padding: "14px 10px" }}>
          <div style={{ ...SUB_LABEL, marginBottom: 8 }}>CALF INFO</div>
          <div className="space-y-2">
            {/* Calf Tag */}
            <div className="flex items-center gap-3 min-w-0">
              <span style={LABEL_STYLE}>Calf Tag</span>
              <input type="text" value={fields.calfTag} onChange={e => set("calfTag", e.target.value)} readOnly={!isEditing} style={getStyle(isEditing)} onFocus={isEditing ? focusGold : undefined} onBlur={isEditing ? blurReset : undefined} />
            </div>
            {/* Tag Color */}
            <div className="flex items-center gap-3 min-w-0">
              <span style={LABEL_STYLE}>Tag Color</span>
              {isEditing ? (
                <div className="relative flex-1">
                  <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", width: 8, height: 8, borderRadius: 9999, backgroundColor: TAG_COLOR_HEX[fields.calfColor] || "#999", zIndex: 1 }} />
                  <select value={fields.calfColor} onChange={e => set("calfColor", e.target.value)} style={{ ...INPUT_BASE, flex: "unset", width: "100%", paddingLeft: 28, appearance: "auto" as const }} onFocus={focusGold} onBlur={blurReset}>
                    {TAG_COLOR_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
              ) : (
                <div style={INPUT_READONLY} className="flex items-center gap-2">
                  <span style={{ width: 8, height: 8, borderRadius: 9999, backgroundColor: TAG_COLOR_HEX[fields.calfColor] || "#999", flexShrink: 0 }} />
                  <span>{fields.calfColor}</span>
                </div>
              )}
            </div>
            {/* Calf EID */}
            <div className="flex items-center gap-2">
              <span style={LABEL_STYLE}>Calf EID</span>
              <input type="text" value={fields.calfEid} onChange={e => set("calfEid", e.target.value)} readOnly={!isEditing} placeholder="None recorded" style={getStyle(isEditing)} onFocus={isEditing ? focusGold : undefined} onBlur={isEditing ? blurReset : undefined} />
            </div>
            {/* Sex */}
            <div className="flex items-center gap-2">
              <span style={LABEL_STYLE}>Sex</span>
              {isEditing ? (
                <select value={fields.calfSex} onChange={e => set("calfSex", e.target.value as CalvingRecord["calfSex"])} style={{ ...INPUT_BASE, appearance: "auto" as const }} onFocus={focusGold} onBlur={blurReset}>
                  {calvingSexOptions.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              ) : (
                <div style={INPUT_READONLY}><span style={{ lineHeight: "40px" }}>{fields.calfSex}</span></div>
              )}
            </div>
            {/* Sire */}
            <div className="flex items-center gap-2">
              <span style={LABEL_STYLE}>Sire</span>
              <input type="text" value={fields.sire} onChange={e => set("sire", e.target.value)} readOnly={!isEditing} style={getStyle(isEditing)} onFocus={isEditing ? focusGold : undefined} onBlur={isEditing ? blurReset : undefined} />
            </div>
            {/* Wt / Size */}
            <div>
              <div className="flex items-center gap-2">
                <span style={LABEL_STYLE}>Wt / Size</span>
                <input type="number" value={fields.birthWeight} onChange={e => set("birthWeight", e.target.value)} readOnly={!isEditing} placeholder="lbs" style={getStyle(isEditing)} onFocus={isEditing ? focusGold : undefined} onBlur={isEditing ? blurReset : undefined} />
                <span style={{ color: "rgba(26,26,26,0.25)", margin: "0 2px" }}>/</span>
                <input type="number" min={1} max={5} value={fields.calfSize} onChange={e => set("calfSize", e.target.value)} readOnly={!isEditing} placeholder="1–5" style={{ ...getStyle(isEditing), flex: "unset", width: 72 }} onFocus={isEditing ? focusGold : undefined} onBlur={isEditing ? blurReset : undefined} />
              </div>
              {!isEditing && fields.calfSize && scoreLabels.calfSize[parseInt(fields.calfSize)] && (
                <div style={{ marginLeft: 104, fontSize: 11, color: "rgba(26,26,26,0.40)", marginTop: 2 }}>
                  {scoreLabels.calfSize[parseInt(fields.calfSize)]}
                </div>
              )}
            </div>
            {/* Status */}
            <div className="flex items-center gap-2">
              <span style={LABEL_STYLE}>Status</span>
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
                      className="rounded-full flex-1"
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
                <span style={{ fontSize: 12, color: "rgba(26,26,26,0.35)" }}>No scores recorded</span>
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
                <span style={{ fontSize: 12, color: "rgba(26,26,26,0.35)" }}>No scores recorded</span>
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
        <div className="rounded-xl border" style={{ borderColor: "rgba(212,212,208,0.60)", backgroundColor: "white", padding: "14px 10px" }}>
          <div style={{ ...SUB_LABEL, marginBottom: 8 }}>NOTES</div>
          {/* Quick notes */}
          <div className="flex flex-wrap gap-2 mb-3">
            {isEditing ? (
              quickNoteLabels.map(n => {
                const active = fields.quickNotes.includes(n);
                return (
                  <button
                    key={n}
                    onClick={() => set("quickNotes", active ? fields.quickNotes.filter(x => x !== n) : [...fields.quickNotes, n])}
                    className="rounded-full cursor-pointer active:scale-[0.96]"
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
                <span style={{ fontSize: 13, color: "rgba(26,26,26,0.35)" }}>None</span>
              ) : (
                fields.quickNotes.map(n => (
                  <span key={n} className="rounded-full" style={{ padding: "6px 12px", fontSize: 13, fontWeight: 600, backgroundColor: "#0E2646", color: "white" }}>{n}</span>
                ))
              )
            )}
          </div>
          {/* Memo */}
          <div style={{ ...SUB_LABEL, marginBottom: 6 }}>MEMO</div>
          {isEditing ? (
            <textarea
              value={fields.memo}
              onChange={e => set("memo", e.target.value)}
              placeholder="Notes about this record…"
              style={{
                width: "100%", minHeight: 64, resize: "none", borderRadius: 8, padding: "10px 12px",
                backgroundColor: "#F5F5F0", border: "1px solid #D4D4D0", fontSize: 16, fontWeight: 400,
                color: "#1A1A1A", outline: "none",
              }}
              onFocus={focusGold}
              onBlur={blurReset}
            />
          ) : (
            fields.memo ? (
              <p style={{ fontSize: 14, color: "#1A1A1A", lineHeight: 1.5, margin: 0 }}>{fields.memo}</p>
            ) : (
              <span style={{ fontSize: 13, color: "rgba(26,26,26,0.35)" }}>None</span>
            )
          )}
        </div>

        {/* Bottom actions */}
        <div className="flex gap-3 pt-2 pb-6">
          <button
            onClick={handleCancel}
            className="flex-1 rounded-full py-3.5 border border-[#D4D4D0] bg-white cursor-pointer active:scale-[0.97] transition-all"
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
            className="flex-[2] rounded-full py-3.5 bg-[#F3D12A] cursor-pointer active:scale-[0.97] transition-all"
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
        <span style={{ ...LABEL_STYLE, paddingTop: 8 }}>{label}</span>
        {isEditing ? (
          <select
            value={value}
            onChange={e => onChange(e.target.value)}
            style={{ ...INPUT_BASE, appearance: "auto" as const }}
            onFocus={focusGold}
            onBlur={blurReset}
          >
            <option value="">Select 1–{max}</option>
            {Array.from({ length: max }, (_, i) => (
              <option key={i + 1} value={String(i + 1)}>{i + 1}</option>
            ))}
          </select>
        ) : (
          <div style={{ ...INPUT_READONLY, display: "flex", alignItems: "center" }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: "#1A1A1A" }}>{(value && labels[parseInt(value)]) || value || "—"}</span>
          </div>
        )}
      </div>
      {isEditing && value && labels[parseInt(value)] && (
        <div style={{ marginLeft: 104, fontSize: 11, color: "rgba(26,26,26,0.40)", marginTop: 2 }}>
          {labels[parseInt(value)]}
        </div>
      )}
    </div>
  );
}