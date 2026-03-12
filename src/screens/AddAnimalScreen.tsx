import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOperation } from "@/contexts/OperationContext";
import CollapsibleSection from "@/components/CollapsibleSection";
import { useChuteSideToast } from "@/components/ToastContext";
import {
  TAG_COLOR_OPTIONS,
  TAG_COLOR_HEX,
  SEX_OPTIONS,
  ANIMAL_TYPE_OPTIONS,
  YEAR_OPTIONS,
  STATUS_OPTIONS,
  BREED_OPTIONS,
  FLAG_OPTIONS,
  QUICK_NOTES,
  QUICK_NOTE_PILL_COLORS,
} from "@/lib/constants";
import { LABEL_STYLE, INPUT_CLS, SUB_LABEL } from "@/lib/styles";

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
  const [selectedQuickNotes, setSelectedQuickNotes] = useState<string[]>([]);
  const [sire, setSire] = useState("");
  const [dam, setDam] = useState("");
  const [regName, setRegName] = useState("");
  const [regNumber, setRegNumber] = useState("");
  const [memo, setMemo] = useState("");
  const [duplicate, setDuplicate] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const { showToast } = useChuteSideToast();
  const navigate = useNavigate();
  const { operationId } = useOperation();
  const queryClient = useQueryClient();

  useEffect(() => {
    setDuplicate(tag === "3309" && tagColor === "Pink" && yearBorn === "2020");
  }, [tag, tagColor, yearBorn]);

  const handleSave = async () => {
    if (!tag.trim()) { showToast("error", "Tag is required"); return; }
    if (!sex) { showToast("error", "Sex is required"); return; }
    if (!animalType) { showToast("error", "Type is required"); return; }
    setIsSaving(true);
    try {
      const { data, error } = await supabase
        .from("animals")
        .insert({
          operation_id: operationId,
          tag: tag.trim(),
          tag_color: tagColor === "No Tag" ? null : tagColor,
          eid: eid.trim() || null,
          sex,
          type: animalType || null,
          year_born: yearBorn ? parseInt(yearBorn) : null,
          status,
          breed: breed || null,
          registered: !!regName || !!regNumber,
          reg_name: regName.trim() || null,
          reg_number: regNumber.trim() || null,
          memo: [
            selectedQuickNotes.length > 0 ? selectedQuickNotes.join(", ") : null,
            memo.trim() || null,
          ].filter(Boolean).join(" — ") || null,
          lifetime_id: null,
        })
        .select()
        .single();
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["animals"] });
      queryClient.invalidateQueries({ queryKey: ["animal-counts"] });
      showToast("success", `${tag.trim()} added to herd`);
      navigate("/animals/" + data.id);
    } catch (err: any) {
      showToast("error", err.message || "Failed to save");
    } finally {
      setIsSaving(false);
    }
  };

  const Row = ({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) => (
    <div className="flex items-center gap-2 min-w-0">
      <span style={LABEL_STYLE}>
        {label}
        {required && !children && <span style={{ color: "#9B2335" }}> *</span>}
      </span>
      <div style={{ flex: 1, minWidth: 0, display: "flex" }}>
        {children}
      </div>
    </div>
  );

  const pedigreePreview = [sire && `Sire: ${sire}`, dam && `Dam: ${dam}`, regName, regNumber].filter(Boolean).join(" · ");

  return (
    <div className="px-4 pt-4 pb-10 space-y-3">
      {/* DUPLICATE WARNING */}
      {duplicate && (
        <div
          className="rounded-xl px-3 py-3 flex items-start gap-3"
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
      <div className="rounded-xl bg-white px-3 py-3.5 space-y-2" style={{ border: "1px solid rgba(212,212,208,0.60)" }}>
        <div style={SUB_LABEL}>IDENTITY</div>

        <div>
          <Row label="Tag">
            <input type="text" value={tag} onChange={e => setTag(e.target.value)} placeholder="Tag number" className={INPUT_CLS} style={{ fontSize: 16 }} />
          </Row>
          {tag.length > 0 && (
            <div style={{ marginLeft: 93, marginTop: 2, fontSize: 11, color: "rgba(26,26,26,0.35)", fontStyle: "italic" }}>
              Tag + color + year must be unique within your operation
            </div>
          )}
        </div>

        <Row label="Tag Color">
          <div className="relative flex-1">
            <span
              className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full"
              style={{ width: 10, height: 10, backgroundColor: TAG_COLOR_HEX[tagColor] }}
            />
            <select value={tagColor} onChange={e => setTagColor(e.target.value)} className={INPUT_CLS + " pl-7 w-full"} style={{ fontSize: 16 }}>
              {TAG_COLOR_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </Row>

        <Row label="EID">
          <input type="text" value={eid} onChange={e => setEid(e.target.value)} placeholder="Optional — scan or type" className={INPUT_CLS} style={{ fontSize: 16 }} />
        </Row>

        <div className="border-t" style={{ borderColor: "rgba(26,26,26,0.06)", margin: "4px 0" }} />

        <Row label={sex ? "Sex" : "Sex *"}>
          <select value={sex} onChange={e => setSex(e.target.value)} className={INPUT_CLS} style={{ fontSize: 16, color: sex ? "#1A1A1A" : "rgba(26,26,26,0.35)" }}>
            <option value="">Select sex…</option>
            {SEX_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </Row>

        <Row label={animalType ? "Type" : "Type *"}>
          <select value={animalType} onChange={e => setAnimalType(e.target.value)} className={INPUT_CLS} style={{ fontSize: 16, color: animalType ? "#1A1A1A" : "rgba(26,26,26,0.35)" }}>
            <option value="">Select type…</option>
            {ANIMAL_TYPE_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </Row>

        <Row label="Year Born">
          <select value={yearBorn} onChange={e => setYearBorn(e.target.value)} className={INPUT_CLS} style={{ fontSize: 16 }}>
            {YEAR_OPTIONS.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </Row>

        <Row label="Status">
          <select value={status} onChange={e => setStatus(e.target.value)} className={INPUT_CLS} style={{ fontSize: 16 }}>
            {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </Row>

        <Row label="Breed">
          <select value={breed} onChange={e => setBreed(e.target.value)} className={INPUT_CLS} style={{ fontSize: 16, color: breed ? "#1A1A1A" : "rgba(26,26,26,0.35)" }}>
            <option value="">Optional</option>
            {BREED_OPTIONS.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
        </Row>
      </div>

      {/* FLAG CARD */}
      <div className="rounded-xl bg-white px-3 py-3.5 space-y-2" style={{ border: "1px solid rgba(212,212,208,0.60)" }}>
        <div style={SUB_LABEL}>FLAG</div>

        <div className="flex gap-2">
          {FLAG_OPTIONS.map(f => {
            const active = flag === f.color;
            return (
              <button
                key={f.color}
                className="flex-1 rounded-full py-2 border cursor-pointer transition-all active:scale-[0.96]"
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  backgroundColor: active ? f.hex : "transparent",
                  color: active ? (f.color === "gold" ? "#1A1A1A" : "white") : f.hex,
                  borderColor: active ? f.hex : `${f.hex}40`,
                }}
                onClick={() => setFlag(active ? null : f.color)}
              >
                {f.label}
              </button>
            );
          })}
        </div>

        {flag !== null && (
          <Row label="Reason">
            <input type="text" value={flagReason} onChange={e => setFlagReason(e.target.value)} placeholder="Reason for flag" className={INPUT_CLS} style={{ fontSize: 16 }} />
          </Row>
        )}
      </div>

      {/* QUICK NOTES CARD */}
      <div className="rounded-xl bg-white px-3 py-3.5" style={{ border: "1px solid rgba(212,212,208,0.60)" }}>
        <div style={SUB_LABEL}>QUICK NOTES</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, paddingTop: 4 }}>
          {QUICK_NOTES.filter(n => n.context === "all").map(n => {
            const active = selectedQuickNotes.includes(n.label);
            const c = QUICK_NOTE_PILL_COLORS[n.flag || "none"];
            return (
              <button
                key={n.label}
                type="button"
                onClick={() => {
                  setSelectedQuickNotes(prev =>
                    prev.includes(n.label) ? prev.filter(x => x !== n.label) : [...prev, n.label]
                  );
                }}
                className="rounded-full cursor-pointer transition-all active:scale-[0.96]"
                style={{
                  padding: "4px 10px",
                  fontSize: 12,
                  fontWeight: 600,
                  backgroundColor: active ? c.bgSel : c.bg,
                  border: `${active ? 2 : 1}px solid ${active ? c.borderSel : c.border}`,
                  color: c.text,
                  display: "flex",
                  alignItems: "center",
                  gap: 3,
                }}
              >
                {active && (
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                    <path d="M2 5L4 7L8 3" stroke={c.text} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
                {n.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* PEDIGREE CARD */}
      <CollapsibleSection
        title="Pedigree"
        defaultOpen={false}
        collapsedContent={
          <div style={{ fontSize: 12, fontWeight: 500, color: "rgba(26,26,26,0.40)" }} className="truncate">
            {pedigreePreview || "Optional — sire, dam, registration"}
          </div>
        }
      >
        <div className="space-y-2 pt-2">
          <Row label="Sire">
            <input type="text" value={sire} onChange={e => setSire(e.target.value)} placeholder="Search by tag…" className={INPUT_CLS} style={{ fontSize: 16 }} />
          </Row>
          <Row label="Dam">
            <input type="text" value={dam} onChange={e => setDam(e.target.value)} placeholder="Search by tag…" className={INPUT_CLS} style={{ fontSize: 16 }} />
          </Row>
          <Row label="Reg. Name">
            <input type="text" value={regName} onChange={e => setRegName(e.target.value)} placeholder="Registration name" className={INPUT_CLS} style={{ fontSize: 16 }} />
          </Row>
          <Row label="Reg. No.">
            <input type="text" value={regNumber} onChange={e => setRegNumber(e.target.value)} placeholder="Registration number" className={INPUT_CLS} style={{ fontSize: 16 }} />
          </Row>
        </div>
      </CollapsibleSection>

      {/* MEMO CARD */}
      <div className="rounded-xl bg-white px-3 py-3.5" style={{ border: "1px solid rgba(212,212,208,0.60)" }}>
        <div style={{ ...SUB_LABEL, marginBottom: 6 }}>MEMO</div>
        <textarea
          value={memo}
          onChange={e => setMemo(e.target.value)}
          placeholder="Notes about this animal…"
          className="w-full min-h-[72px] resize-none rounded-lg px-3 py-2.5 outline-none transition-all focus:border-[#F3D12A] focus:ring-2 focus:ring-[#F3D12A]/25"
          style={{ backgroundColor: "#F5F5F0", border: "1px solid #D4D4D0", fontSize: 16 }}
        />
      </div>

      {/* ACTION BUTTONS */}
      <div className="flex gap-3 pt-1">
        <button
          className="flex-1 rounded-full py-3.5 border border-[#D4D4D0] bg-white cursor-pointer active:scale-[0.97]"
          style={{ fontSize: 14, fontWeight: 600, color: "#0E2646" }}
          onClick={() => navigate("/animals")}
        >Cancel</button>
        <button
          className="rounded-full py-3.5 cursor-pointer active:scale-[0.97] transition-all"
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
