import React, { useState } from "react";
import { useChuteSideToast } from "@/components/ToastContext";
import ReferenceItemRow from "@/components/ReferenceItemRow";

const labelStyle: React.CSSProperties = { width: 96, flexShrink: 0, fontSize: 14, fontWeight: 600, color: "#1A1A1A" };
const inputClass = "flex-1 h-10 rounded-lg border border-[#D4D4D0] bg-white px-3 outline-none font-['Inter'] transition-all focus:border-[#F3D12A] focus:ring-2 focus:ring-[#F3D12A]/25";

const ReferencePregStagesScreen: React.FC = () => {
  const [stages, setStages] = useState([
    { id: "ps1", label: "Open", sortOrder: 1, isCull: true },
    { id: "ps2", label: "Early", sortOrder: 2, isCull: false },
    { id: "ps3", label: "Mid", sortOrder: 3, isCull: false },
    { id: "ps4", label: "Late", sortOrder: 4, isCull: false },
    { id: "ps5", label: "First Calf", sortOrder: 5, isCull: false },
  ]);
  const [addOpen, setAddOpen] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [newIsCull, setNewIsCull] = useState(false);
  const { showToast } = useChuteSideToast();

  const handleAdd = () => {
    if (!newLabel.trim()) { showToast("error", "Stage name is required"); return; }
    setStages(prev => [...prev, { id: "ps" + Date.now(), label: newLabel.trim(), sortOrder: prev.length + 1, isCull: newIsCull }]);
    showToast("success", newLabel.trim() + " added");
    setNewLabel(""); setNewIsCull(false); setAddOpen(false);
  };

  return (
    <div className="px-3 pt-4 pb-10 space-y-3 font-['Inter']">
      <div className="flex items-center justify-between">
        <span style={{ fontSize: 20, fontWeight: 800, color: "#0E2646" }}>Preg Stages</span>
        <button className="rounded-full h-9 px-4 flex items-center gap-1.5 cursor-pointer active:scale-[0.97] font-['Inter']" style={{ backgroundColor: "#F3D12A", fontSize: 13, fontWeight: 700, color: "#1A1A1A", border: "none" }} onClick={() => setAddOpen(true)}>
          <span style={{ fontSize: 16, fontWeight: 700, lineHeight: 1 }}>+</span> Add Stage
        </button>
      </div>

      {addOpen && (
        <div className="rounded-xl px-3 py-3.5 space-y-2 font-['Inter']" style={{ backgroundColor: "white", border: "2px solid #F3D12A" }}>
          <div className="flex items-center gap-2">
            <span style={labelStyle}>Stage</span>
            <input type="text" value={newLabel} onChange={e => setNewLabel(e.target.value)} placeholder="Stage name" className={inputClass} style={{ fontSize: 16 }} />
          </div>
          <div className="flex items-center justify-between py-1">
            <span style={{ fontSize: 14, fontWeight: 600, color: "#1A1A1A" }}>Marks as cull candidate</span>
            <button
              className="relative cursor-pointer transition-all rounded-full"
              style={{ width: 44, height: 24, backgroundColor: newIsCull ? "#9B2335" : "rgba(26,26,26,0.15)", border: "none" }}
              onClick={() => setNewIsCull(!newIsCull)}
            >
              <span className="absolute rounded-full bg-white shadow transition-all" style={{ width: 16, height: 16, top: 4, left: newIsCull ? 24 : 4 }} />
            </button>
          </div>
          <div className="flex gap-2 mt-1">
            <button className="flex-1 rounded-full py-2.5 border font-['Inter'] cursor-pointer active:scale-[0.97]" style={{ borderColor: "#D4D4D0", backgroundColor: "white", fontSize: 13, fontWeight: 600, color: "#0E2646" }} onClick={() => { setAddOpen(false); setNewLabel(""); setNewIsCull(false); }}>Cancel</button>
            <button className="flex-1 rounded-full py-2.5 font-['Inter'] cursor-pointer active:scale-[0.97]" style={{ backgroundColor: "#0E2646", fontSize: 13, fontWeight: 700, color: "white", border: "none" }} onClick={handleAdd}>Save</button>
          </div>
        </div>
      )}

      <div className="rounded-xl px-3" style={{ backgroundColor: "white", border: "1px solid rgba(212,212,208,0.60)" }}>
        {stages.map(s => (
          <ReferenceItemRow
            key={s.id}
            label={s.label}
            sublabel={"Order: " + s.sortOrder}
            badge={s.isCull ? { text: "CULL", color: "#9B2335", bg: "rgba(155,35,53,0.12)" } : undefined}
            onEdit={() => showToast("info", "Edit " + s.label)}
            onDelete={() => { setStages(prev => prev.filter(x => x.id !== s.id)); showToast("success", s.label + " deleted"); }}
          />
        ))}
        <div style={{ fontSize: 12, color: "rgba(26,26,26,0.35)", fontStyle: "italic", paddingTop: 8, paddingBottom: 4 }}>
          These labels populate the Preg Stage dropdown in PREG projects.
        </div>
      </div>
    </div>
  );
};

export default ReferencePregStagesScreen;
