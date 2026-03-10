import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useChuteSideToast } from "../components/ToastContext";
import FlagIcon from "../components/FlagIcon";

type FlagColor = "teal" | "gold" | "red";

const project = {
  id: "spring-preg-2026",
  name: "Spring Preg Check 2026",
  date: "Feb 24, 2026",
  status: "in-progress" as const,
  type: "PREG",
  group: "Spring Calvers",
  location: "East Pasture",
  headCount: 45,
  products: [
    { name: "Multimin 90", dosage: "12 mL", route: "SQ" },
    { name: "Lutalyse", dosage: "5 mL", route: "IM" },
  ],
};

interface WorkedAnimal {
  tag: string;
  flag?: FlagColor;
  weight: string;
  preg: string;
  pregDays?: string;
  note?: string;
  treatments: string[];
}

const initialWorkedAnimals: WorkedAnimal[] = [
  { tag: "4782", flag: "teal", weight: "1,247", preg: "Confirmed", pregDays: "85", note: "Normal", treatments: ["Multimin 90"] },
  { tag: "3091", flag: "gold", weight: "983", preg: "Confirmed", pregDays: "62", note: "Watch BCS", treatments: ["Multimin 90", "Lutalyse"] },
  { tag: "5520", flag: "red", weight: "1,102", preg: "Open", pregDays: "", note: "Cull candidate", treatments: [] },
  { tag: "2218", weight: "1,340", preg: "Confirmed", pregDays: "105", note: "", treatments: ["Multimin 90"] },
  { tag: "6610", flag: "teal", weight: "1,095", preg: "Confirmed", pregDays: "74", note: "", treatments: [] },
];

const matchedAnimal = {
  tag: "4782",
  flag: "teal" as FlagColor,
  type: "Cow",
  breed: "Angus",
  yearBorn: "2020",
  sex: "Cow",
  weight: "1,247",
  quickNotes: ["Hard keeper", "Good mother"],
  calvingHistory: [
    { calfTag: "8841", calfSex: "Bull", date: "Mar 22, 2025", birthWeight: "85 lbs", note: "Normal birth — strong calf" },
    { calfTag: "7503", calfSex: "Heifer", date: "Apr 8, 2024", birthWeight: "72 lbs", note: "Normal birth" },
    { calfTag: "6218", calfSex: "Bull", date: "Mar 30, 2023", birthWeight: "90 lbs", note: "Large calf, easy pull" },
  ],
  workHistory: [
    { project: "Winter Vaccination 2026", date: "Jan 14, 2026", weight: "1,165", preg: "Confirmed", note: "Normal" },
    { project: "Fall Processing 2025", date: "Oct 15, 2025", weight: "1,152", preg: "Confirmed", note: "" },
    { project: "Spring Preg Check 2025", date: "May 22, 2025", weight: "1,120", preg: "Confirmed", note: "" },
  ],
};

const flagColorMap: Record<FlagColor, string> = { teal: "#55BAAA", gold: "#F3D12A", red: "#9B2335" };

const labelStyle: React.CSSProperties = { width: 96, flexShrink: 0, fontSize: 14, fontWeight: 600, color: "#1A1A1A" };
const inputStyle: React.CSSProperties = {
  flex: 1, height: 40, borderRadius: 8, border: "1px solid #D4D4D0", backgroundColor: "white",
  padding: "0 12px", fontFamily: "'Inter', sans-serif", outline: "none", fontSize: 16,
};

type Tab = "input" | "worked" | "stats" | "details";

export default function CowWorkProjectDetailScreen() {
  const [activeTab, setActiveTab] = useState<Tab>("input");
  const [headerOpen, setHeaderOpen] = useState(false);
  const [tagField, setTagField] = useState("4782");
  const [isMatched, setIsMatched] = useState(true);
  const [isDuplicate, setIsDuplicate] = useState(false);
  const [historyTab, setHistoryTab] = useState<"info" | "calving" | "history">("info");
  const [historyOpen, setHistoryOpen] = useState(false);
  const [workedAnimals, setWorkedAnimals] = useState<WorkedAnimal[]>(initialWorkedAnimals);

  const [pregResult, setPregResult] = useState("");
  const [pregDays, setPregDays] = useState("");
  const [calfSex, setCalfSex] = useState("");
  const [weight, setWeight] = useState("");
  const [quickNote, setQuickNote] = useState("");
  const [sampleId, setSampleId] = useState("");
  const [memo, setMemo] = useState("");

  const { showToast } = useChuteSideToast();
  const navigate = useNavigate();

  const tabLabels: Record<Tab, string> = { input: "Input", worked: "Animals", stats: "Stats", details: "Details" };

  const clearForm = () => {
    setTagField(""); setIsMatched(false); setIsDuplicate(false); setHistoryOpen(false);
    setPregResult(""); setPregDays(""); setCalfSex("");
    setWeight(""); setQuickNote(""); setSampleId(""); setMemo("");
  };

  const saveAndNext = () => {
    if (!tagField.trim()) { showToast("error", "Tag required to save"); return; }
    const newRecord: WorkedAnimal = {
      tag: tagField, flag: isMatched ? matchedAnimal.flag : undefined,
      weight, preg: pregResult || "—", pregDays,
      note: memo || quickNote, treatments: project.products.map(p => p.name),
    };
    setWorkedAnimals(prev => [newRecord, ...prev]);
    showToast("success", `Tag ${tagField} saved`);
    clearForm();
  };

  // Stats
  const confirmedCount = workedAnimals.filter(a => a.preg === "Confirmed").length;
  const openCount = workedAnimals.filter(a => a.preg === "Open").length;
  const suspectCount = workedAnimals.filter(a => a.preg === "Suspect").length;
  const weighedAnimals = workedAnimals.filter(a => a.weight);
  const avgWeight = weighedAnimals.length > 0
    ? Math.round(weighedAnimals.reduce((s, a) => s + parseFloat(a.weight.replace(",", "")), 0) / weighedAnimals.length)
    : 0;

  return (
    <div className="space-y-0 pb-10 font-['Inter']">
      {/* COLLAPSIBLE HEADER */}
      <div
        className="rounded-xl overflow-hidden mb-3 cursor-pointer"
        style={{ background: "linear-gradient(135deg, #0E2646 0%, #153566 100%)" }}
      >
        {/* Collapsed row */}
        <div
          className="flex items-center justify-between px-3.5 py-2.5"
          onClick={() => setHeaderOpen(!headerOpen)}
        >
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <span style={{ fontSize: 22, fontWeight: 800, color: "white", lineHeight: 1, letterSpacing: "-0.02em" }}>
              {workedAnimals.length}
            </span>
            <span style={{ fontSize: 11, fontWeight: 500, color: "rgba(255,255,255,0.50)" }}>worked</span>
            <span className="shrink-0" style={{ width: 1, height: 16, backgroundColor: "rgba(255,255,255,0.15)" }} />
            <span className="truncate" style={{ fontSize: 11, fontWeight: 600, color: "#A8E6DA" }}>{project.name}</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="rounded-full" style={{ fontSize: 10, fontWeight: 700, color: "#F3D12A", backgroundColor: "rgba(243,209,42,0.15)", padding: "3px 8px" }}>
              {tabLabels[activeTab]}
            </span>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"
              style={{ transform: headerOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 200ms" }}>
              <path d="M3.5 5.25L7 8.75L10.5 5.25" stroke="rgba(255,255,255,0.40)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>

        {headerOpen && (
          <>
            {/* Project details block */}
            <div className="px-3.5 pt-3 pb-1" style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}>
              <div style={{ fontSize: 10, fontWeight: 500, color: "rgba(168,230,218,0.50)", marginBottom: 8 }}>In Progress</div>
              <div className="flex gap-5">
                {[
                  { label: "HEAD", value: project.headCount },
                  { label: "WORKED", value: workedAnimals.length },
                  { label: "REMAINING", value: project.headCount - workedAnimals.length },
                ].map(s => (
                  <div key={s.label}>
                    <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.06em", color: "rgba(255,255,255,0.35)", textTransform: "uppercase" }}>{s.label}</div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: "white", lineHeight: 1, marginTop: 2 }}>{s.value}</div>
                  </div>
                ))}
              </div>
              <button
                className="mt-2.5 rounded-lg py-1.5 px-4 cursor-pointer font-['Inter'] active:scale-[0.97] transition-all"
                style={{ fontSize: 11, fontWeight: 700, backgroundColor: "#F3D12A", color: "#1A1A1A", border: "none" }}
                onClick={() => navigate("/cow-work/" + project.id + "/close-out")}
              >
                Complete Project
              </button>
            </div>

            {/* Tab bar */}
            <div className="flex px-3.5 mt-3" style={{ backgroundColor: "rgba(0,0,0,0.15)", borderRadius: "0 0 12px 12px" }}>
              {(["input", "worked", "stats", "details"] as Tab[]).map(tab => (
                <button
                  key={tab}
                  className="flex-1 py-2.5 cursor-pointer relative font-['Inter']"
                  style={{
                    fontSize: 12, fontWeight: activeTab === tab ? 700 : 500,
                    color: activeTab === tab ? "white" : "rgba(255,255,255,0.40)",
                    background: "none", border: "none",
                  }}
                  onClick={() => { setActiveTab(tab); setHeaderOpen(false); }}
                >
                  {tabLabels[tab]}
                  {activeTab === tab && (
                    <span className="absolute bottom-0 left-1/2 -translate-x-1/2 rounded-full" style={{ width: 36, height: 2, backgroundColor: "#F3D12A" }} />
                  )}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* TAB CONTENT */}
      <div className="pt-0 space-y-3">
        {/* =================== INPUT TAB =================== */}
        {activeTab === "input" && (
          <>
            {/* Tag / EID field */}
            <div className="rounded-xl bg-white px-3 py-3.5 space-y-3" style={{ border: "1px solid rgba(212,212,208,0.60)" }}>
              <div className="flex items-center gap-2">
                <input
                  className="flex-1 h-12 rounded-lg px-3 font-['Inter'] outline-none transition-all"
                  style={{ fontSize: 16, fontWeight: 600, color: "#0E2646", border: "2px solid #F3D12A", backgroundColor: "white" }}
                  placeholder="Tag or EID…"
                  value={tagField}
                  onChange={e => { setTagField(e.target.value); setIsMatched(false); }}
                />
                <button
                  className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 cursor-pointer active:scale-[0.97]"
                  style={{ backgroundColor: "rgba(14,38,70,0.06)", border: "1px solid rgba(14,38,70,0.10)" }}
                  onClick={() => showToast("info", "Connect EID wand to scan")}
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <rect x="1" y="3" width="2" height="10" rx="0.5" fill="#0E2646" />
                    <rect x="4" y="2" width="1.5" height="12" rx="0.5" fill="#0E2646" opacity="0.6" />
                    <rect x="7" y="3" width="2" height="10" rx="0.5" fill="#0E2646" />
                    <rect x="10.5" y="1" width="1.5" height="14" rx="0.5" fill="#0E2646" opacity="0.6" />
                    <rect x="13" y="3" width="2" height="10" rx="0.5" fill="#0E2646" />
                  </svg>
                </button>
              </div>

              {/* Match indicators */}
              {isMatched && (
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="shrink-0 rounded-full" style={{ width: 8, height: 8, backgroundColor: "#55BAAA" }} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: "#55BAAA" }}>Tag 4782 — Pink Cow 2020</span>
                </div>
              )}
              {isDuplicate && (
                <div className="rounded-lg px-3 py-2 mt-1" style={{ backgroundColor: "rgba(243,209,42,0.12)", border: "1px solid rgba(243,209,42,0.30)" }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: "#B8960F" }}>Already in project · View record</span>
                </div>
              )}
              {tagField.length >= 3 && !isMatched && !isDuplicate && (
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="shrink-0 rounded-full" style={{ width: 8, height: 8, backgroundColor: "#E87461" }} />
                  <span style={{ fontSize: 13, fontWeight: 500, color: "#E87461" }}>No match found</span>
                </div>
              )}
            </div>

            {/* Cow History Panel */}
            {isMatched && (
              <div className="rounded-xl bg-white overflow-hidden" style={{ border: "1px solid rgba(212,212,208,0.60)" }}>
                <button
                  className="flex items-center justify-between w-full px-3 py-3 cursor-pointer"
                  style={{ background: "none", border: "none" }}
                  onClick={() => setHistoryOpen(!historyOpen)}
                >
                  <div className="flex items-center gap-1">
                    <span style={{ fontSize: 14, fontWeight: 700, color: "#55BAAA" }}>{matchedAnimal.tag}</span>
                    <span style={{ fontSize: 13, fontWeight: 500, color: "rgba(26,26,26,0.50)" }}>· {matchedAnimal.type} · {matchedAnimal.yearBorn}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span style={{ fontSize: 11, fontWeight: 600, color: "rgba(26,26,26,0.35)" }}>History</span>
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none"
                      style={{ transform: historyOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 200ms" }}>
                      <path d="M3.5 5.25L7 8.75L10.5 5.25" stroke="rgba(26,26,26,0.40)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                </button>

                {historyOpen && (
                  <div style={{ borderTop: "1px solid rgba(212,212,208,0.40)" }}>
                    {/* Sub-tabs */}
                    <div className="flex px-3" style={{ borderBottom: "1px solid rgba(212,212,208,0.40)" }}>
                      {(["info", "calving", "history"] as const).map(t => (
                        <button
                          key={t}
                          className="py-2 cursor-pointer relative font-['Inter'] mr-4"
                          style={{
                            fontSize: 12, fontWeight: historyTab === t ? 700 : 500,
                            color: historyTab === t ? "#0E2646" : "rgba(26,26,26,0.40)",
                            background: "none", border: "none",
                          }}
                          onClick={() => setHistoryTab(t)}
                        >
                          {t === "info" ? "Info" : t === "calving" ? "Calving" : "History"}
                          {historyTab === t && (
                            <span className="absolute bottom-0 left-1/2 -translate-x-1/2 rounded-full" style={{ width: 36, height: 2, backgroundColor: "#F3D12A" }} />
                          )}
                        </button>
                      ))}
                    </div>

                    {/* Info sub-tab */}
                    {historyTab === "info" && (
                      <div className="px-3 py-3">
                        <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                          {[
                            ["TYPE", matchedAnimal.type], ["BREED", matchedAnimal.breed],
                            ["YEAR", matchedAnimal.yearBorn], ["SEX", matchedAnimal.sex],
                            ["WEIGHT", matchedAnimal.weight + " lbs"], ["FLAG", "Management"],
                          ].map(([l, v]) => (
                            <div key={l}>
                              <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.06em", color: "rgba(26,26,26,0.35)", textTransform: "uppercase" }}>{l}</div>
                              <div style={{ fontSize: 14, fontWeight: 600, color: "#1A1A1A" }}>{v}</div>
                            </div>
                          ))}
                        </div>
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {matchedAnimal.quickNotes.map(n => (
                            <span key={n} className="rounded-full px-2.5 py-1 bg-[#0E2646] text-white" style={{ fontSize: 11, fontWeight: 600 }}>{n}</span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Calving sub-tab */}
                    {historyTab === "calving" && (
                      <div className="px-3 py-3 space-y-2">
                        {matchedAnimal.calvingHistory.map(c => (
                          <div key={c.calfTag} className="rounded-xl px-3 py-3 bg-[#0E2646]">
                            <div className="flex items-center gap-2">
                              <span style={{ fontSize: 14, fontWeight: 700, color: "white" }}>Calf {c.calfTag}</span>
                              <span className="rounded-full" style={{
                                fontSize: 9, fontWeight: 700, padding: "2px 8px",
                                backgroundColor: c.calfSex === "Bull" ? "rgba(85,186,170,0.15)" : "rgba(232,160,191,0.20)",
                                color: c.calfSex === "Bull" ? "#55BAAA" : "#E8A0BF",
                              }}>{c.calfSex}</span>
                              <span className="ml-auto" style={{ fontSize: 11, color: "rgba(240,240,240,0.35)" }}>{c.date}</span>
                            </div>
                            <div className="flex gap-2 mt-1.5">
                              <span className="rounded-full" style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", backgroundColor: "rgba(240,240,240,0.08)", color: "rgba(240,240,240,0.60)" }}>
                                {c.birthWeight}
                              </span>
                            </div>
                            {c.note && <div style={{ fontSize: 12, color: "rgba(240,240,240,0.45)", marginTop: 4 }}>{c.note}</div>}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* History sub-tab */}
                    {historyTab === "history" && (
                      <div className="px-3 py-3 space-y-0">
                        {matchedAnimal.workHistory.map(w => (
                          <div key={w.project} className="py-2" style={{ borderBottom: "1px solid rgba(26,26,26,0.06)" }}>
                            <div className="flex items-center justify-between">
                              <span style={{ fontSize: 13, fontWeight: 600, color: "#1A1A1A" }}>{w.project}</span>
                              <span style={{ fontSize: 11, color: "rgba(26,26,26,0.40)" }}>{w.date}</span>
                            </div>
                            <div className="flex gap-2 mt-1">
                              <span className="rounded-full" style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", backgroundColor: "rgba(14,38,70,0.08)", color: "#0E2646" }}>
                                {w.weight} lbs
                              </span>
                              <span style={{ fontSize: 12, color: "rgba(26,26,26,0.50)" }}>Preg: {w.preg}</span>
                            </div>
                            {w.note && <div style={{ fontSize: 12, color: "rgba(26,26,26,0.40)", fontStyle: "italic", marginTop: 2 }}>{w.note}</div>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* PREG fields */}
            <div className="rounded-xl bg-white px-3 py-3.5 space-y-2" style={{ border: "1px solid rgba(212,212,208,0.60)" }}>
              <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.10em", color: "rgba(26,26,26,0.35)", textTransform: "uppercase", marginBottom: 4 }}>PREG CHECK</div>
              <div className="flex items-center gap-2">
                <label style={labelStyle}>Preg</label>
                <select value={pregResult} onChange={e => setPregResult(e.target.value)} style={inputStyle}
                  className="focus:border-[#F3D12A] focus:ring-2 focus:ring-[#F3D12A]/25">
                  <option value="" disabled>Select…</option>
                  <option>Confirmed</option><option>Open</option><option>Suspect</option><option>First Calf Heifer</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <label style={labelStyle}>Days Gest.</label>
                <input type="number" value={pregDays} onChange={e => setPregDays(e.target.value)} placeholder="0" style={inputStyle}
                  className="focus:border-[#F3D12A] focus:ring-2 focus:ring-[#F3D12A]/25" />
              </div>
              <div className="flex items-center gap-2">
                <label style={labelStyle}>Calf Sex</label>
                <select value={calfSex} onChange={e => setCalfSex(e.target.value)} style={inputStyle}
                  className="focus:border-[#F3D12A] focus:ring-2 focus:ring-[#F3D12A]/25">
                  <option value="" disabled>Select…</option>
                  <option>Bull</option><option>Heifer</option><option>Twin-BB</option><option>Twin-HH</option><option>Twin-BH</option><option>Unknown</option>
                </select>
              </div>
            </div>

            {/* Optional fields */}
            <div className="rounded-xl bg-white px-3 py-3.5 space-y-2" style={{ border: "1px solid rgba(212,212,208,0.60)" }}>
              <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.10em", color: "rgba(26,26,26,0.35)", textTransform: "uppercase", marginBottom: 4 }}>ADDITIONAL</div>
              <div className="flex items-center gap-2">
                <label style={labelStyle}>Weight</label>
                <input type="number" value={weight} onChange={e => setWeight(e.target.value)} placeholder="lbs" style={inputStyle}
                  className="focus:border-[#F3D12A] focus:ring-2 focus:ring-[#F3D12A]/25" />
              </div>
              <div className="flex items-center gap-2">
                <label style={labelStyle}>Quick Note</label>
                <input type="text" value={quickNote} onChange={e => setQuickNote(e.target.value)} placeholder="Select or type…" style={inputStyle}
                  className="focus:border-[#F3D12A] focus:ring-2 focus:ring-[#F3D12A]/25" />
              </div>
              <div className="flex items-center gap-2">
                <label style={labelStyle}>Sample ID</label>
                <input type="text" value={sampleId} onChange={e => setSampleId(e.target.value)} placeholder="DNA/sample ID" style={inputStyle}
                  className="focus:border-[#F3D12A] focus:ring-2 focus:ring-[#F3D12A]/25" />
              </div>
              <div className="pt-2">
                <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.08em", color: "rgba(26,26,26,0.40)", textTransform: "uppercase", marginBottom: 6 }}>MEMO</div>
                <textarea
                  value={memo} onChange={e => setMemo(e.target.value)}
                  className="w-full resize-none rounded-lg px-3 py-2.5 font-['Inter'] outline-none transition-all focus:border-[#F3D12A] focus:ring-2 focus:ring-[#F3D12A]/25"
                  style={{ minHeight: 56, backgroundColor: "#F5F5F0", border: "1px solid #D4D4D0", fontSize: 16 }}
                />
              </div>
            </div>

            {/* Products given */}
            <div className="rounded-xl bg-white px-3 py-3.5" style={{ border: "1px solid rgba(212,212,208,0.60)" }}>
              <div className="flex items-center justify-between">
                <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.08em", color: "rgba(26,26,26,0.40)", textTransform: "uppercase" }}>PRODUCTS GIVEN</span>
                <span className="cursor-pointer" style={{ fontSize: 11, fontWeight: 600, color: "#55BAAA" }}>Edit</span>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {project.products.map(p => (
                  <span key={p.name} className="rounded-full px-3 py-1" style={{ fontSize: 11, fontWeight: 600, backgroundColor: "rgba(85,186,170,0.12)", color: "#55BAAA" }}>
                    {p.name} · {p.dosage} {p.route}
                  </span>
                ))}
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex gap-3 pt-1">
              <button
                className="flex-1 rounded-full py-3.5 border border-[#D4D4D0] bg-white font-['Inter'] cursor-pointer active:scale-[0.97]"
                style={{ fontSize: 14, fontWeight: 600, color: "#0E2646" }}
                onClick={clearForm}
              >Reset</button>
              <button
                className="rounded-full py-3.5 bg-[#0E2646] font-['Inter'] cursor-pointer active:scale-[0.97]"
                style={{ flex: 2, fontSize: 14, fontWeight: 700, color: "white", border: "none" }}
                onClick={saveAndNext}
              >Save & Next</button>
            </div>
          </>
        )}

        {/* =================== ANIMALS WORKED TAB =================== */}
        {activeTab === "worked" && (
          <>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.10em", color: "rgba(26,26,26,0.35)", textTransform: "uppercase" }}>
              ANIMALS WORKED · {workedAnimals.length}
            </div>
            <div className="space-y-2">
              {workedAnimals.map((a, i) => {
                const pregColor = a.preg === "Confirmed" ? { bg: "rgba(85,186,170,0.15)", color: "#55BAAA" }
                  : a.preg === "Open" ? { bg: "rgba(232,116,97,0.15)", color: "#E87461" }
                  : { bg: "rgba(240,240,240,0.10)", color: "rgba(240,240,240,0.50)" };
                const tagColor = a.flag ? flagColorMap[a.flag] : "rgba(240,240,240,0.90)";
                return (
                  <div key={i} className="rounded-xl px-3 py-3.5 bg-[#0E2646]">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span style={{ fontSize: 15, fontWeight: 700, color: tagColor }}>{a.tag}</span>
                        {a.flag && <FlagIcon color={a.flag} size="sm" />}
                      </div>
                      <span className="rounded-full" style={{ fontSize: 9, fontWeight: 700, padding: "2px 8px", backgroundColor: pregColor.bg, color: pregColor.color }}>
                        {a.preg}
                      </span>
                    </div>
                    {(a.weight || a.note) && (
                      <div style={{ fontSize: 12, color: "rgba(240,240,240,0.45)", marginTop: 4 }}>
                        {a.weight && `${a.weight} lbs`}{a.weight && a.note ? " · " : ""}{a.note}
                      </div>
                    )}
                    {a.treatments.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {a.treatments.map(t => (
                          <span key={t} className="rounded-full px-2.5 py-0.5" style={{ fontSize: 10, fontWeight: 600, backgroundColor: "rgba(85,186,170,0.12)", color: "#55BAAA" }}>{t}</span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* =================== STATS TAB =================== */}
        {activeTab === "stats" && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              {[
                { value: workedAnimals.length, label: "WORKED" },
                { value: confirmedCount, label: "CONFIRMED" },
                { value: openCount, label: "OPEN" },
                { value: `${avgWeight} lbs`, label: "AVG WEIGHT" },
              ].map(s => (
                <div key={s.label} className="rounded-xl px-4 py-3.5 font-['Inter']" style={{ background: "linear-gradient(145deg, #0E2646 0%, #163A5E 55%, #55BAAA 100%)" }}>
                  <div style={{ fontSize: 28, fontWeight: 800, color: "white", lineHeight: 1 }}>{s.value}</div>
                  <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.08em", color: "rgba(168,230,218,0.70)", textTransform: "uppercase", marginTop: 4 }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* Preg breakdown */}
            <div className="rounded-xl bg-white px-3 py-3.5" style={{ border: "1px solid rgba(212,212,208,0.60)" }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: "#0E2646", marginBottom: 12 }}>Preg Results</div>
              {[
                { label: "Confirmed", count: confirmedCount, color: "#55BAAA" },
                { label: "Open", count: openCount, color: "#E87461" },
                { label: "Suspect", count: suspectCount, color: "#F3D12A" },
              ].map(r => {
                const total = workedAnimals.length || 1;
                return (
                  <div key={r.label} className="flex items-center gap-3 mb-2">
                    <span className="shrink-0 rounded-full" style={{ width: 8, height: 8, backgroundColor: r.color }} />
                    <span className="flex-1" style={{ fontSize: 13, fontWeight: 600, color: "#1A1A1A" }}>{r.label}</span>
                    <div className="rounded-full" style={{ flex: 2, height: 6, backgroundColor: "rgba(26,26,26,0.06)" }}>
                      <div className="rounded-full" style={{ height: 6, backgroundColor: r.color, width: `${(r.count / total) * 100}%` }} />
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "#1A1A1A", minWidth: 20, textAlign: "right" }}>{r.count}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* =================== DETAILS TAB =================== */}
        {activeTab === "details" && (
          <div className="rounded-xl bg-white px-4 py-4 space-y-3" style={{ border: "1px solid rgba(212,212,208,0.60)" }}>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.10em", color: "rgba(26,26,26,0.35)", textTransform: "uppercase" }}>PROJECT DETAILS</div>
            {[
              ["Date", project.date],
              ["Type", project.type],
              ["Group", project.group],
              ["Location", project.location],
              ["Status", project.status.charAt(0).toUpperCase() + project.status.slice(1)],
              ["Head Count", String(project.headCount)],
            ].map(([label, value]) => (
              <div key={label} className="flex items-center gap-3">
                <span style={{ width: 105, flexShrink: 0, fontSize: 14, fontWeight: 600, color: "#1A1A1A" }}>{label}</span>
                <span style={{ fontSize: 14, color: "rgba(26,26,26,0.70)" }}>{value}</span>
              </div>
            ))}

            <div style={{ borderTop: "1px solid rgba(26,26,26,0.06)", margin: "8px 0" }} />

            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.10em", color: "rgba(26,26,26,0.35)", textTransform: "uppercase" }}>PRODUCTS GIVEN</div>
            {project.products.map(p => (
              <div key={p.name} className="flex items-center justify-between py-1.5" style={{ borderBottom: "1px solid rgba(26,26,26,0.06)" }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: "#1A1A1A" }}>{p.name}</span>
                <span style={{ fontSize: 13, color: "rgba(26,26,26,0.50)" }}>{p.dosage} · {p.route}</span>
              </div>
            ))}

            <div style={{ borderTop: "1px solid rgba(26,26,26,0.06)", margin: "8px 0" }} />

            <div className="flex gap-2 flex-wrap">
              <button
                className="rounded-full px-4 py-2 border border-[#D4D4D0] cursor-pointer active:scale-[0.97] font-['Inter']"
                style={{ fontSize: 13, fontWeight: 600, color: "#0E2646", backgroundColor: "transparent" }}
              >Edit Project</button>
              <button
                className="rounded-full px-4 py-2 cursor-pointer active:scale-[0.97] font-['Inter']"
                style={{ fontSize: 13, fontWeight: 700, color: "#1A1A1A", backgroundColor: "#F3D12A", border: "none" }}
                onClick={() => navigate("/cow-work/" + project.id + "/close-out")}
              >Close Out</button>
              <button
                className="rounded-full px-4 py-2 cursor-pointer active:scale-[0.97] font-['Inter']"
                style={{ fontSize: 13, color: "rgba(212,24,61,0.60)", border: "1px solid rgba(212,24,61,0.20)", backgroundColor: "transparent" }}
              >Delete</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
