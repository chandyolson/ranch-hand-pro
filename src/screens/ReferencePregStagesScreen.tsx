import React, { useState } from "react";
import { useChuteSideToast } from "@/components/ToastContext";
import ReferenceItemRow from "@/components/ReferenceItemRow";

const labelStyle: React.CSSProperties = { width: 96, flexShrink: 0, fontSize: 14, fontWeight: 600, color: "#1A1A1A" };
const inputClass = "flex-1 h-10 rounded-lg border border-[#D4D4D0] bg-white px-3 outline-none font-['Inter'] transition-all focus:border-[#F3D12A] focus:ring-2 focus:ring-[#F3D12A]/25";

const ReferencePregStagesScreen: React.FC = () => {
  const [stages, setStages] = useState([
    { id: "ps1", name: "Open", sortOrder: 1 },
    { id: "ps2", name: "Short", sortOrder: 2 },
    { id: "ps3", name: "Mid", sortOrder: 3 },
    { id: "ps4", name: "Long", sortOrder: 4 },
    { id: "ps5", name: "Confirmed", sortOrder: 5 },
  ]);
  const [addOpen, setAddOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const { showToast } = useChuteSideToast();

  const handleAdd = () => {
    if (!newName.trim()) { showToast("error", "Stage name is required"); return; }
    setStages(prev => [...prev, { id: "ps" + Date.now(), name: newName.trim(), sortOrder: prev.length + 1 }]);
    showToast("success", newName.trim() + " added");
    setNewName(""); setAddOpen(false);
  };

  return (
    <div className="px-4 pt-4 pb-10 space-y-3 font-['Inter']">
      <div className="flex items-center justify-between">
        <span style={{ fontSize: 20, fontWeight: 800, color: "#0E2646" }}>Preg Stages</span>
        <button className="rounded-full h-9 px-4 flex items-center gap-1.5 cursor-pointer active:scale-[0.97] font-['Inter']" style={{ backgroundColor: "#F3D12A", fontSize: 13, fontWeight: 700, color: "#1A1A1A", border: "none" }} onClick={() => setAddOpen(true)}>
          <span style={{ fontSize: 16, fontWeight: 700, lineHeight: 1 }}>+</span> Add Stage
        </button>
      </div>

      {addOpen && (
        <div className="rounded-xl px-3 py-3.5 space-y-2 font-['Inter']" style={{ backgroundColor: "white", border: "2px solid #F3D12A" }}>
          <div className="flex items-center gap-2">
            <span style={labelStyle}>Name</span>
            <input type="text" value={newName} onChange={e => setNewName(e.target.value)} placeholder="Stage name" className={inputClass} style={{ fontSize: 16 }} />
          </div>
          <div className="flex gap-2 mt-1">
            <button className="flex-1 rounded-full py-2.5 border font-['Inter'] cursor-pointer active:scale-[0.97]" style={{ borderColor: "#D4D4D0", backgroundColor: "white", fontSize: 13, fontWeight: 600, color: "#0E2646" }} onClick={() => { setAddOpen(false); setNewName(""); }}>Cancel</button>
            <button className="flex-1 rounded-full py-2.5 font-['Inter'] cursor-pointer active:scale-[0.97]" style={{ backgroundColor: "#0E2646", fontSize: 13, fontWeight: 700, color: "white", border: "none" }} onClick={handleAdd}>Save</button>
          </div>
        </div>
      )}

      <div className="rounded-xl px-3" style={{ backgroundColor: "white", border: "1px solid rgba(212,212,208,0.60)" }}>
        {stages.map(s => (
          <ReferenceItemRow
            key={s.id}
            label={s.name}
            sublabel={"Order: " + s.sortOrder}
            onEdit={() => showToast("info", "Edit " + s.name)}
            onDelete={() => { setStages(prev => prev.filter(x => x.id !== s.id)); showToast("success", s.name + " deleted"); }}
          />
        ))}
      </div>
    </div>
  );
};

export default ReferencePregStagesScreen;
