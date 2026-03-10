import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import CollapsibleSection from "@/components/CollapsibleSection";
import { useChuteSideToast } from "@/components/ToastContext";

const tagColorOptions = ["Pink","Yellow","Orange","Green","Blue","White","Red","Purple","No Tag"];
const tagColorHexMap: Record<string,string> = {
  Pink:"#E8A0BF", Yellow:"#F3D12A", Orange:"#E8863A", Green:"#55BAAA",
  Blue:"#5B8DEF", White:"#E0E0E0", Red:"#D4606E", Purple:"#A77BCA", "No Tag":"#999999",
};
const sexOptions    = ["Bull","Cow","Steer","Spayed Heifer","Heifer"];
const typeOptions   = ["Calf","Yearling","Feeder","Replacement Heifer","Cow","Bull"];
const yearOptions   = Array.from({length:12},(_,i)=>(2026-i).toString());
const statusOptions = ["Active","Sold","Dead","Culled","Missing"];
const breedOptions  = ["Angus","Hereford","Simmental","Charolais","Limousin","Red Angus","Shorthorn","Brahman","Brangus","Mixed / Commercial","Other"];
const flagOptions   = [
  { value:"teal",  label:"Management", hex:"#55BAAA" },
  { value:"gold",  label:"Production",  hex:"#F3D12A" },
  { value:"red",   label:"Cull",        hex:"#9B2335" },
];

const inputCls = "flex-1 h-10 rounded-lg border border-[#D4D4D0] bg-white px-3 font-['Inter'] outline-none transition-all focus:border-[#F3D12A] focus:ring-2 focus:ring-[#F3D12A]/25";
const inputStyle: React.CSSProperties = { fontSize: 16, minWidth: 0 };
const labelStyle: React.CSSProperties = { width: 96, flexShrink: 0, fontSize: 14, fontWeight: 600, color: "#1A1A1A", fontFamily: "'Inter', sans-serif" };
const subLabelStyle: React.CSSProperties = { fontSize: 9, fontWeight: 700, letterSpacing: "0.10em", color: "rgba(26,26,26,0.35)", textTransform: "uppercase" as const, marginBottom: 4, fontFamily: "'Inter', sans-serif" };

export default function AddAnimalScreen() {
  const [tag, setTag] = useState("");
  const [tagColor, setTagColor] = useState("Yellow");
  const [eid, setEid] = useState("");
  const [sex, setSex] = useState("");
  const [animalType, setAnimalType] = useState("");
  const [yearBorn, setYearBorn] = useState("2024");
  const [status, setStatus] = useState("Active");
  const [breed, setBreed] = useState("");
  const [flag, setFlag] = useState<string | null>(null);
  const [flagReason, setFlagReason] = useState("");
  const [sire, setSire] = useState("");
  const [dam, setDam] = useState("");
  const [regName, setRegName] = useState("");
  const [regNumber, setRegNumber] = useState("");
  const [memo, setMemo] = useState("");
  const [duplicate, setDuplicate] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const { showToast } = useChuteSideToast();
  const navigate = useNavigate();

  useEffect(() => {
    setDuplicate(tag === "3309" && tagColor === "Pink" && yearBorn === "2020");
  }, [tag, tagColor, yearBorn]);

  const handleSave = async () => {
    if (!tag.trim()) { showToast("error", "Tag is required"); return; }
    if (!sex) { showToast("error", "Sex is required"); return; }
    if (!animalType) { showToast("error", "Type is required"); return; }
    setIsSaving(true);
    await new Promise(r => setTimeout(r, 500));
    setIsSaving(false);
    showToast("success", "Tag " + tag + " added to herd");
    navigate("/animals");
  };

  const Row = ({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) => (
    <div className="flex items-center gap-2">
      <span style={labelStyle}>
        {label}
        {required && !children && <span style={{ color: "#9B2335" }}> *</span>}
      </span>
      {children}
    </div>
  );

  const pedigreePreview = [sire && `Sire: ${sire}`, dam && `Dam: ${dam}`, regName, regNumber].filter(Boolean).join(" · ");

  return (
    <div className="px-3 pt-4 pb-10 space-y-3">
      {/* DUPLICATE WARNING */}
      {duplicate && (
        <div
          className="rounded-xl px-3 py-3 flex items-start gap-3 font-['Inter']"
          style={{ backgroundColor: "rgba(243,209,42,0.10)", border: "1px solid rgba(243,209,42,0.40)" }}
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" className="shrink-0 mt-0.5">
            <path d="M9 1.5L16.5 15H1.5L9 1.5Z" stroke="#B8960F" strokeWidth="1.5" strokeLinejoin="round" fill="none" />
            <path d="M9 7V10" stroke="#B8960F" strokeWidth="1.5" strokeLinecap="round" />
            <circle cx="9" cy="12.5" r="0.75" fill="#B8960F" />
          </svg>
          <div className="flex-1 min-w-0">
            <div style={{ fontSize: 13, fontWeight: 700, color: "#B8960F" }}>Possible duplicate</div>
            <div style={{ fontSize: 12, fontWeight: 400, color: "#B8960F", marginTop: 2 }}>
              Tag {tag} · {tagColor} · {yearBorn} already exists.
            </div>
            <div
              className="cursor-pointer underline"
              style={{ fontSize: 12, fontWeight: 700, color: "#B8960F", marginTop: 4 }}
              onClick={() => navigate("/animals/3309")}
            >
              View existing record →
            </div>
          </div>
        </div>
      )}

      {/* IDENTITY CARD */}
      <div className="rounded-xl bg-white px-3 py-3.5 space-y-2 font-['Inter']" style={{ border: "1px solid rgba(212,212,208,0.60)" }}>
        <div style={subLabelStyle}>IDENTITY</div>

        <div>
          <Row label="Tag">
            <input type="text" value={tag} onChange={e => setTag(e.target.value)} placeholder="Tag number" className={inputCls} style={inputStyle} />
          </Row>
          {tag.length > 0 && (
            <div style={{ marginLeft: 104, marginTop: 2, fontSize: 11, color: "rgba(26,26,26,0.35)", fontStyle: "italic", fontFamily: "'Inter', sans-serif" }}>
              Tag + color + year must be unique within your operation
            </div>
          )}
        </div>

        <Row label="Tag Color">
          <div className="relative flex-1">
            <span
              className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full"
              style={{ width: 10, height: 10, backgroundColor: tagColorHexMap[tagColor] }}
            />
            <select value={tagColor} onChange={e => setTagColor(e.target.value)} className={inputCls + " pl-7 w-full"} style={inputStyle}>
              {tagColorOptions.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </Row>

        <Row label="EID">
          <input type="text" value={eid} onChange={e => setEid(e.target.value)} placeholder="Optional — scan or type" className={inputCls} style={inputStyle} />
        </Row>

        <div className="border-t" style={{ borderColor: "rgba(26,26,26,0.06)", margin: "4px 0" }} />

        <Row label={sex ? "Sex" : "Sex *"}>
          <select value={sex} onChange={e => setSex(e.target.value)} className={inputCls} style={{ ...inputStyle, color: sex ? "#1A1A1A" : "rgba(26,26,26,0.35)" }}>
            <option value="">Select sex…</option>
            {sexOptions.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </Row>

        <Row label={animalType ? "Type" : "Type *"}>
          <select value={animalType} onChange={e => setAnimalType(e.target.value)} className={inputCls} style={{ ...inputStyle, color: animalType ? "#1A1A1A" : "rgba(26,26,26,0.35)" }}>
            <option value="">Select type…</option>
            {typeOptions.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </Row>

        <Row label="Year Born">
          <select value={yearBorn} onChange={e => setYearBorn(e.target.value)} className={inputCls} style={inputStyle}>
            {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </Row>

        <Row label="Status">
          <select value={status} onChange={e => setStatus(e.target.value)} className={inputCls} style={inputStyle}>
            {statusOptions.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </Row>

        <Row label="Breed">
          <select value={breed} onChange={e => setBreed(e.target.value)} className={inputCls} style={{ ...inputStyle, color: breed ? "#1A1A1A" : "rgba(26,26,26,0.35)" }}>
            <option value="">Optional</option>
            {breedOptions.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
        </Row>
      </div>

      {/* FLAG CARD */}
      <div className="rounded-xl bg-white px-3 py-3.5 space-y-2 font-['Inter']" style={{ border: "1px solid rgba(212,212,208,0.60)" }}>
        <div style={subLabelStyle}>FLAG</div>

        <div className="flex items-center gap-2">
          <span style={labelStyle}>Flag</span>
          <div className="flex gap-2 flex-wrap flex-1">
            {flagOptions.map(f => {
              const active = flag === f.value;
              return (
                <button
                  key={f.value}
                  className="rounded-full px-3 py-1.5 border font-['Inter'] cursor-pointer transition-all active:scale-[0.96]"
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    backgroundColor: active ? f.hex : "transparent",
                    color: active ? (f.value === "gold" ? "#1A1A1A" : "white") : f.hex,
                    borderColor: active ? f.hex : `${f.hex}40`,
                  }}
                  onClick={() => setFlag(active ? null : f.value)}
                >
                  {f.label}
                </button>
              );
            })}
          </div>
        </div>

        {flag !== null && (
          <Row label="Reason">
            <input type="text" value={flagReason} onChange={e => setFlagReason(e.target.value)} placeholder="Reason for flag" className={inputCls} style={inputStyle} />
          </Row>
        )}
      </div>

      {/* PEDIGREE CARD */}
      <CollapsibleSection
        title="Pedigree"
        defaultOpen={false}
        collapsedContent={
          <div style={{ fontSize: 12, fontWeight: 500, color: "rgba(26,26,26,0.40)", fontFamily: "'Inter', sans-serif" }} className="truncate">
            {pedigreePreview || "Optional — sire, dam, registration"}
          </div>
        }
      >
        <div className="space-y-2 pt-2 font-['Inter']">
          <Row label="Sire">
            <input type="text" value={sire} onChange={e => setSire(e.target.value)} placeholder="Search by tag…" className={inputCls} style={inputStyle} />
          </Row>
          <Row label="Dam">
            <input type="text" value={dam} onChange={e => setDam(e.target.value)} placeholder="Search by tag…" className={inputCls} style={inputStyle} />
          </Row>
          <Row label="Reg. Name">
            <input type="text" value={regName} onChange={e => setRegName(e.target.value)} placeholder="Registration name" className={inputCls} style={inputStyle} />
          </Row>
          <Row label="Reg. No.">
            <input type="text" value={regNumber} onChange={e => setRegNumber(e.target.value)} placeholder="Registration number" className={inputCls} style={inputStyle} />
          </Row>
        </div>
      </CollapsibleSection>

      {/* MEMO CARD */}
      <div className="rounded-xl bg-white px-3 py-3.5 font-['Inter']" style={{ border: "1px solid rgba(212,212,208,0.60)" }}>
        <div style={{ ...subLabelStyle, marginBottom: 6 }}>MEMO</div>
        <textarea
          value={memo}
          onChange={e => setMemo(e.target.value)}
          placeholder="Notes about this animal…"
          className="w-full min-h-[72px] resize-none rounded-lg px-3 py-2.5 font-['Inter'] outline-none transition-all focus:border-[#F3D12A] focus:ring-2 focus:ring-[#F3D12A]/25"
          style={{ backgroundColor: "#F5F5F0", border: "1px solid #D4D4D0", fontSize: 16 }}
        />
      </div>

      {/* ACTION BUTTONS */}
      <div className="flex gap-3 pt-1">
        <button
          className="flex-1 rounded-full py-3.5 border border-[#D4D4D0] bg-white font-['Inter'] cursor-pointer active:scale-[0.97]"
          style={{ fontSize: 14, fontWeight: 600, color: "#0E2646" }}
          onClick={() => navigate("/animals")}
        >Cancel</button>
        <button
          className="rounded-full py-3.5 font-['Inter'] cursor-pointer active:scale-[0.97] transition-all"
          style={{
            flex: 2,
            fontSize: 14,
            fontWeight: 700,
            color: "#1A1A1A",
            backgroundColor: isSaving ? "rgba(243,209,42,0.60)" : "#F3D12A",
            border: "none",
            cursor: isSaving ? "not-allowed" : "pointer",
          }}
          onClick={handleSave}
          disabled={isSaving}
        >{isSaving ? "Saving…" : "Add Animal"}</button>
      </div>
    </div>
  );
}
