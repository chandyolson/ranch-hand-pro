import React, { useState } from "react";
import { useChuteSideToast } from "@/components/ToastContext";
import ReferenceItemRow from "@/components/ReferenceItemRow";

const labelStyle: React.CSSProperties = { width: 96, flexShrink: 0, fontSize: 14, fontWeight: 600, color: "#1A1A1A" };
const inputClass = "flex-1 h-10 rounded-lg border border-[#D4D4D0] bg-white px-3 outline-none font-['Inter'] transition-all focus:border-[#F3D12A] focus:ring-2 focus:ring-[#F3D12A]/25";

const ReferenceLocationsScreen: React.FC = () => {
  const [locations, setLocations] = useState([
    { id: "l1", name: "Home Place", parent: null as string | null, memo: "Main headquarters" },
    { id: "l2", name: "East Pasture", parent: "Home Place", memo: "320 acres, east of road" },
    { id: "l3", name: "West Pasture", parent: "Home Place", memo: "180 acres" },
    { id: "l4", name: "Calving Barn", parent: "Home Place", memo: "12 stalls" },
    { id: "l5", name: "North Place", parent: null, memo: "Summer grass lease" },
    { id: "l6", name: "South Pasture", parent: "North Place", memo: "" },
    { id: "l7", name: "Feedlot", parent: null, memo: "" },
    { id: "l8", name: "Sale Barn", parent: null, memo: "Sioux Falls Livestock" },
  ]);
  const [addOpen, setAddOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newParent, setNewParent] = useState("");
  const { showToast } = useChuteSideToast();

  const topLevel = locations.filter(l => !l.parent);

  const handleAdd = () => {
    if (!newName.trim()) { showToast("error", "Name is required"); return; }
    setLocations(prev => [...prev, { id: "l" + Date.now(), name: newName.trim(), parent: newParent || null, memo: "" }]);
    showToast("success", newName.trim() + " added");
    setNewName(""); setNewParent(""); setAddOpen(false);
  };

  return (
    <div className="px-4 pt-4 pb-10 space-y-3 font-['Inter']">
      <div className="flex items-center justify-between">
        <span style={{ fontSize: 20, fontWeight: 800, color: "#0E2646" }}>Locations</span>
        <button
          className="rounded-full h-9 px-4 flex items-center gap-1.5 cursor-pointer active:scale-[0.97] font-['Inter']"
          style={{ backgroundColor: "#F3D12A", fontSize: 13, fontWeight: 700, color: "#1A1A1A", border: "none" }}
          onClick={() => setAddOpen(true)}
        >
          <span style={{ fontSize: 16, fontWeight: 700, lineHeight: 1 }}>+</span> Add Location
        </button>
      </div>

      {addOpen && (
        <div className="rounded-xl px-3 py-3.5 space-y-2 font-['Inter']" style={{ backgroundColor: "white", border: "2px solid #F3D12A" }}>
          <div className="flex items-center gap-2">
            <span style={labelStyle}>Name</span>
            <input type="text" value={newName} onChange={e => setNewName(e.target.value)} placeholder="Location name" className={inputClass} style={{ fontSize: 16 }} />
          </div>
          <div className="flex items-center gap-2">
            <span style={labelStyle}>Parent</span>
            <select value={newParent} onChange={e => setNewParent(e.target.value)} className={inputClass} style={{ fontSize: 16 }}>
              <option value="">None (top level)</option>
              {topLevel.map(l => <option key={l.id} value={l.name}>{l.name}</option>)}
            </select>
          </div>
          <div className="flex gap-2 mt-1">
            <button className="flex-1 rounded-full py-2.5 border font-['Inter'] cursor-pointer active:scale-[0.97]" style={{ borderColor: "#D4D4D0", backgroundColor: "white", fontSize: 13, fontWeight: 600, color: "#0E2646" }} onClick={() => { setAddOpen(false); setNewName(""); setNewParent(""); }}>Cancel</button>
            <button className="flex-1 rounded-full py-2.5 font-['Inter'] cursor-pointer active:scale-[0.97]" style={{ backgroundColor: "#0E2646", fontSize: 13, fontWeight: 700, color: "white", border: "none" }} onClick={handleAdd}>Save</button>
          </div>
        </div>
      )}

      <div className="rounded-xl px-3" style={{ backgroundColor: "white", border: "1px solid rgba(212,212,208,0.60)" }}>
        {topLevel.map(tl => {
          const children = locations.filter(l => l.parent === tl.name);
          return (
            <React.Fragment key={tl.id}>
              <ReferenceItemRow
                label={tl.name}
                sublabel={tl.memo || undefined}
                onEdit={() => showToast("info", "Edit " + tl.name)}
                onDelete={() => { setLocations(prev => prev.filter(x => x.id !== tl.id && x.parent !== tl.name)); showToast("success", tl.name + " deleted"); }}
              />
              {children.length > 0 && (
                <div className="pl-4 ml-3" style={{ borderLeft: "1px solid rgba(26,26,26,0.08)" }}>
                  {children.map(ch => (
                    <ReferenceItemRow
                      key={ch.id}
                      label={ch.name}
                      sublabel={ch.memo || "Sub-location"}
                      badge={{ text: tl.name, bg: "rgba(14,38,70,0.06)", color: "#0E2646" }}
                      onEdit={() => showToast("info", "Edit " + ch.name)}
                      onDelete={() => { setLocations(prev => prev.filter(x => x.id !== ch.id)); showToast("success", ch.name + " deleted"); }}
                    />
                  ))}
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};

export default ReferenceLocationsScreen;
