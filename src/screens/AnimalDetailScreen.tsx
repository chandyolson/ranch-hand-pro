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
                ))
