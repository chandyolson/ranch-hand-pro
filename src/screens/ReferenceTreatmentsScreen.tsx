import React, { useState } from "react";
import { useChuteSideToast } from "@/components/ToastContext";
import ReferenceItemRow from "@/components/ReferenceItemRow";

const labelStyle: React.CSSProperties = { width: 96, flexShrink: 0, fontSize: 14, fontWeight: 600, color: "#1A1A1A" };
const inputClass = "flex-1 h-10 rounded-lg border border-[#D4D4D0] bg-white px-3 outline-none font-['Inter'] transition-all focus:border-[#F3D12A] focus:ring-2 focus:ring-[#F3D12A]/25";

const typeConfig: Record<string, { label: string; color: string; bg: string }> = {
  vaccine:    { label: "Vaccine",    color: "#55BAAA", bg: "rgba(85,186,170,0.12)" },
  antibiotic: { label: "Antibiotic", color: "#F3D12A", bg: "rgba(243,209,42,0.12)" },
  supplement: { label: "Supplement", color: "#A8A8F0", bg: "rgba(168,168,240,0.12)" },
  hormone:    { label: "Hormone",   color: "#E8A0BF", bg: "rgba(232,160,191,0.12)" },
  other:      { label: "Other",     color: "#E8863A", bg: "rgba(232,134,58,0.12)" },
};

const ReferenceTreatmentsScreen: React.FC = () => {
  const [products, setProducts] = useState([
    { id: "p1",  name: "Bovi-Shield Gold FP5",  type: "vaccine",    dosage: "2 mL SQ" },
    { id: "p2",  name: "Vista Once SQ",         type: "vaccine",    dosage: "2 mL SQ" },
    { id: "p3",  name: "Ultrabac 7/Somubac",    type: "vaccine",    dosage: "5 mL SQ" },
    { id: "p4",  name: "Draxxin",               type: "antibiotic", dosage: "1.1 mL/100 lbs SQ" },
    { id: "p5",  name: "Excede",                type: "antibiotic", dosage: "1.5 mL/100 lbs SQ" },
    { id: "p6",  name: "LA-200",                type: "antibiotic", dosage: "4.5 mL/100 lbs IM" },
    { id: "p7",  name: "Lutalyse",              type: "hormone",    dosage: "5 mL IM" },
    { id: "p8",  name: "CIDR Insert",           type: "hormone",    dosage: "1 insert" },
    { id: "p9",  name: "Ivermectin Pour-On",    type: "other",      dosage: "1 mL/22 lbs" },
    { id: "p10", name: "Multimin 90",           type: "supplement", dosage: "1 mL/100 lbs SQ" },
    { id: "p11", name: "Bo-Se",                 type: "supplement", dosage: "1 mL/200 lbs IM" },
    { id: "p12", name: "Banamine",              type: "other",      dosage: "1 mL/100 lbs IV" },
  ]);
  const [addOpen, setAddOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState("vaccine");
  const [newDosage, setNewDosage] = useState("");
  const { showToast } = useChuteSideToast();

  const handleAdd = () => {
    if (!newName.trim()) { showToast("error", "Product name is required"); return; }
    setProducts(prev => [...prev, { id: "p" + Date.now(), name: newName.trim(), type: newType, dosage: newDosage.trim() }]);
    showToast("success", newName.trim() + " added");
    setNewName(""); setNewType("vaccine"); setNewDosage(""); setAddOpen(false);
  };

  return (
    <div className="px-4 pt-4 pb-10 space-y-3 font-['Inter']">
      <div className="flex items-center justify-between">
        <span style={{ fontSize: 20, fontWeight: 800, color: "#0E2646" }}>Products</span>
        <button className="rounded-full h-9 px-4 flex items-center gap-1.5 cursor-pointer active:scale-[0.97] font-['Inter']" style={{ backgroundColor: "#F3D12A", fontSize: 13, fontWeight: 700, color: "#1A1A1A", border: "none" }} onClick={() => setAddOpen(true)}>
          <span style={{ fontSize: 16, fontWeight: 700, lineHeight: 1 }}>+</span> Add Product
        </button>
      </div>

      {addOpen && (
        <div className="rounded-xl px-3 py-3.5 space-y-2 font-['Inter']" style={{ backgroundColor: "white", border: "2px solid #F3D12A" }}>
          <div className="flex items-center gap-2">
            <span style={labelStyle}>Name</span>
            <input type="text" value={newName} onChange={e => setNewName(e.target.value)} placeholder="Product name" className={inputClass} style={{ fontSize: 16 }} />
          </div>
          <div className="flex items-center gap-2">
            <span style={labelStyle}>Type</span>
            <select value={newType} onChange={e => setNewType(e.target.value)} className={inputClass} style={{ fontSize: 16 }}>
              {Object.entries(typeConfig).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <span style={labelStyle}>Dosage</span>
            <input type="text" value={newDosage} onChange={e => setNewDosage(e.target.value)} placeholder="e.g. 2 mL SQ" className={inputClass} style={{ fontSize: 16 }} />
          </div>
          <div className="flex gap-2 mt-1">
            <button className="flex-1 rounded-full py-2.5 border font-['Inter'] cursor-pointer active:scale-[0.97]" style={{ borderColor: "#D4D4D0", backgroundColor: "white", fontSize: 13, fontWeight: 600, color: "#0E2646" }} onClick={() => { setAddOpen(false); setNewName(""); setNewDosage(""); }}>Cancel</button>
            <button className="flex-1 rounded-full py-2.5 font-['Inter'] cursor-pointer active:scale-[0.97]" style={{ backgroundColor: "#0E2646", fontSize: 13, fontWeight: 700, color: "white", border: "none" }} onClick={handleAdd}>Save</button>
          </div>
        </div>
      )}

      <div className="rounded-xl px-3" style={{ backgroundColor: "white", border: "1px solid rgba(212,212,208,0.60)" }}>
        {products.map(p => {
          const tc = typeConfig[p.type];
          return (
            <ReferenceItemRow
              key={p.id}
              label={p.name}
              sublabel={p.dosage}
              badge={tc ? { text: tc.label, bg: tc.bg, color: tc.color } : undefined}
              onEdit={() => showToast("info", "Edit " + p.name)}
              onDelete={() => { setProducts(prev => prev.filter(x => x.id !== p.id)); showToast("success", p.name + " deleted"); }}
            />
          );
        })}
      </div>
    </div>
  );
};

export default ReferenceTreatmentsScreen;
