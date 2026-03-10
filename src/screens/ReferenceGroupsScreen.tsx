import React, { useState } from "react";
import { useChuteSideToast } from "@/components/ToastContext";
import ReferenceItemRow from "@/components/ReferenceItemRow";

const labelStyle: React.CSSProperties = { width: 96, flexShrink: 0, fontSize: 14, fontWeight: 600, color: "#1A1A1A" };
const inputClass = "flex-1 h-10 rounded-lg border border-[#D4D4D0] bg-white px-3 outline-none font-['Inter'] transition-all focus:border-[#F3D12A] focus:ring-2 focus:ring-[#F3D12A]/25";

const ReferenceGroupsScreen: React.FC = () => {
  const [groups, setGroups] = useState([
    { id: "g1", name: "Spring Calvers", count: 45, memo: "Main spring calving group" },
    { id: "g2", name: "Fall Calvers", count: 12, memo: "" },
    { id: "g3", name: "Replacement Heifers", count: 24, memo: "2024 and 2025 year classes" },
    { id: "g4", name: "Bulls", count: 8, memo: "Working bulls only" },
    { id: "g5", name: "Yearlings", count: 38, memo: "" },
    { id: "g6", name: "Summer Pairs", count: 31, memo: "Cow-calf pairs on summer grass" },
  ]);
  const [addOpen, setAddOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newMemo, setNewMemo] = useState("");
  const { showToast } = useChuteSideToast();

  const handleAdd = () => {
    if (!newName.trim()) { showToast("error", "Name is required"); return; }
    setGroups(prev => [...prev, { id: "g" + Date.now(), name: newName.trim(), count: 0, memo: newMemo.trim() }]);
    showToast("success", newName.trim() + " added");
    setNewName(""); setNewMemo(""); setAddOpen(false);
  };

  return (
    <div className="px-3 pt-4 pb-10 space-y-3 font-['Inter']">
      <div className="flex items-center justify-between">
        <span style={{ fontSize: 20, fontWeight: 800, color: "#0E2646" }}>Groups</span>
        <button
          className="rounded-full h-9 px-4 flex items-center gap-1.5 cursor-pointer active:scale-[0.97] font-['Inter']"
          style={{ backgroundColor: "#F3D12A", fontSize: 13, fontWeight: 700, color: "#1A1A1A", border: "none" }}
          onClick={() => setAddOpen(true)}
        >
          <span style={{ fontSize: 16, fontWeight: 700, lineHeight: 1 }}>+</span> Add Group
        </button>
      </div>

      {addOpen && (
        <div className="rounded-xl px-3 py-3.5 space-y-2 font-['Inter']" style={{ backgroundColor: "white", border: "2px solid #F3D12A" }}>
          <div className="flex items-center gap-2">
            <span style={labelStyle}>Name</span>
            <input type="text" value={newName} onChange={e => setNewName(e.target.value)} placeholder="Group name" className={inputClass} style={{ fontSize: 16 }} />
          </div>
          <div className="flex items-center gap-2">
            <span style={labelStyle}>Memo</span>
            <input type="text" value={newMemo} onChange={e => setNewMemo(e.target.value)} placeholder="Optional note" className={inputClass} style={{ fontSize: 16 }} />
          </div>
          <div className="flex gap-2 mt-1">
            <button className="flex-1 rounded-full py-2.5 border font-['Inter'] cursor-pointer active:scale-[0.97]" style={{ borderColor: "#D4D4D0", backgroundColor: "white", fontSize: 13, fontWeight: 600, color: "#0E2646" }} onClick={() => { setAddOpen(false); setNewName(""); setNewMemo(""); }}>Cancel</button>
            <button className="flex-1 rounded-full py-2.5 font-['Inter'] cursor-pointer active:scale-[0.97]" style={{ backgroundColor: "#0E2646", fontSize: 13, fontWeight: 700, color: "white", border: "none" }} onClick={handleAdd}>Save</button>
          </div>
        </div>
      )}

      <div className="rounded-xl px-3" style={{ backgroundColor: "white", border: "1px solid rgba(212,212,208,0.60)" }}>
        {groups.map(g => (
          <ReferenceItemRow
            key={g.id}
            label={g.name}
            sublabel={g.count + " animals" + (g.memo ? " · " + g.memo : "")}
            onEdit={() => showToast("info", "Edit " + g.name)}
            onDelete={() => { setGroups(prev => prev.filter(x => x.id !== g.id)); showToast("success", g.name + " deleted"); }}
          />
        ))}
      </div>
    </div>
  );
};

export default ReferenceGroupsScreen;
