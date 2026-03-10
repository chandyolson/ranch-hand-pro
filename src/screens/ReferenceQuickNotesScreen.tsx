import React, { useState } from "react";
import { useChuteSideToast } from "@/components/ToastContext";
import ReferenceItemRow from "@/components/ReferenceItemRow";
import { QUICK_NOTES, QUICK_NOTE_PILL_COLORS } from "@/lib/constants";
import { LABEL_STYLE, INPUT_CLS } from "@/lib/styles";

const categoryConfig: Record<string, { label: string; color: string; bg: string }> = {
  management: { label: "Management", color: "#55BAAA", bg: "rgba(85,186,170,0.12)" },
  cull:       { label: "Cull",       color: "#9B2335", bg: "rgba(155,35,53,0.12)" },
  health:     { label: "Health",     color: "#F3D12A", bg: "rgba(243,209,42,0.12)" },
};

const ReferenceQuickNotesScreen: React.FC = () => {
  const [notes, setNotes] = useState(
    QUICK_NOTES.map((q, i) => ({
      id: `qn${i + 1}`,
      text: q.label,
      category: q.flag === "red" ? "cull" : q.flag === "gold" ? "health" : "management",
    }))
  );
  const [addOpen, setAddOpen] = useState(false);
  const [newText, setNewText] = useState("");
  const [newCategory, setNewCategory] = useState("management");
  const { showToast } = useChuteSideToast();

  const handleAdd = () => {
    if (!newText.trim()) { showToast("error", "Note text is required"); return; }
    setNotes(prev => [...prev, { id: "qn" + Date.now(), text: newText.trim(), category: newCategory }]);
    showToast("success", newText.trim() + " added");
    setNewText(""); setNewCategory("management"); setAddOpen(false);
  };

  return (
    <div className="px-4 pt-4 pb-10 space-y-3">
      <div className="flex items-center justify-between">
        <span style={{ fontSize: 20, fontWeight: 800, color: "#0E2646" }}>Quick Notes</span>
        <button
          className="rounded-full h-9 px-4 flex items-center gap-1.5 cursor-pointer active:scale-[0.97]"
          style={{ backgroundColor: "#F3D12A", fontSize: 13, fontWeight: 700, color: "#1A1A1A", border: "none" }}
          onClick={() => setAddOpen(true)}
        >
          <span style={{ fontSize: 16, fontWeight: 700, lineHeight: 1 }}>+</span> Add Note
        </button>
      </div>

      {addOpen && (
        <div className="rounded-xl px-3 py-3.5 space-y-2" style={{ backgroundColor: "white", border: "2px solid #F3D12A" }}>
          <div className="flex items-center gap-2">
            <span style={LABEL_STYLE}>Note</span>
            <input type="text" value={newText} onChange={e => setNewText(e.target.value)} placeholder="Note text" className={INPUT_CLS} style={{ fontSize: 16 }} />
          </div>
          <div className="flex items-center gap-2">
            <span style={LABEL_STYLE}>Category</span>
            <select value={newCategory} onChange={e => setNewCategory(e.target.value)} className={INPUT_CLS} style={{ fontSize: 16 }}>
              <option value="management">Management</option>
              <option value="cull">Cull</option>
              <option value="health">Health</option>
            </select>
          </div>
          <div className="flex gap-2 mt-1">
            <button className="flex-1 rounded-full py-2.5 border cursor-pointer active:scale-[0.97]" style={{ borderColor: "#D4D4D0", backgroundColor: "white", fontSize: 13, fontWeight: 600, color: "#0E2646" }} onClick={() => { setAddOpen(false); setNewText(""); }}>Cancel</button>
            <button className="flex-1 rounded-full py-2.5 cursor-pointer active:scale-[0.97]" style={{ backgroundColor: "#0E2646", fontSize: 13, fontWeight: 700, color: "white", border: "none" }} onClick={handleAdd}>Save</button>
          </div>
        </div>
      )}

      <div className="rounded-xl px-3" style={{ backgroundColor: "white", border: "1px solid rgba(212,212,208,0.60)" }}>
        {notes.map(n => {
          const cat = categoryConfig[n.category];
          return (
            <ReferenceItemRow
              key={n.id}
              label={n.text}
              badge={cat ? { text: cat.label, bg: cat.bg, color: cat.color } : undefined}
              onEdit={() => showToast("info", "Edit " + n.text)}
              onDelete={() => { setNotes(prev => prev.filter(x => x.id !== n.id)); showToast("success", n.text + " deleted"); }}
            />
          );
        })}
      </div>

      <div className="rounded-xl px-3 py-3.5" style={{ backgroundColor: "white", border: "1px solid rgba(212,212,208,0.60)" }}>
        <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.10em", color: "rgba(26,26,26,0.35)", textTransform: "uppercase", marginBottom: 8 }}>
          PREVIEW — how these appear in entry screens
        </div>
        <div className="flex flex-wrap gap-2">
          {notes.map(n => (
            <span
              key={n.id}
              className="rounded-full px-3 py-1.5 border"
              style={{ fontSize: 13, fontWeight: 600, backgroundColor: "white", borderColor: "#D4D4D0", color: "#1A1A1A" }}
            >
              {n.text}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ReferenceQuickNotesScreen;
