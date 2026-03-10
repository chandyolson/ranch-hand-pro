import React, { useState } from "react";
import { useChuteSideToast } from "@/components/ToastContext";

const labelStyle: React.CSSProperties = { width: 96, flexShrink: 0, fontSize: 14, fontWeight: 600, color: "#1A1A1A" };
const inputClass = "flex-1 h-10 rounded-lg border border-[#D4D4D0] bg-white px-3 outline-none font-['Inter'] transition-all focus:border-[#F3D12A] focus:ring-2 focus:ring-[#F3D12A]/25";

const ReferenceSettingsScreen: React.FC = () => {
  const [opName, setOpName] = useState("Saddle Butte Ranch");
  const [ownerName, setOwnerName] = useState("Jake Owens");
  const [email, setEmail] = useState("jake@saddlebutte.com");
  const [phone, setPhone] = useState("(605) 555-0142");
  const [premiseId, setPremiseId] = useState("SD-04827");
  const [opType, setOpType] = useState("Cow-Calf");
  const { showToast } = useChuteSideToast();

  return (
    <div className="px-4 pt-4 pb-10 space-y-3 font-['Inter']">
      <span style={{ fontSize: 20, fontWeight: 800, color: "#0E2646" }}>Operation Settings</span>

      <div className="rounded-xl px-3 py-3.5 space-y-2" style={{ backgroundColor: "white", border: "1px solid rgba(212,212,208,0.60)" }}>
        <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.10em", color: "rgba(26,26,26,0.35)", textTransform: "uppercase", marginBottom: 4 }}>OPERATION INFO</div>
        {[
          { label: "Name", value: opName, onChange: setOpName },
          { label: "Owner", value: ownerName, onChange: setOwnerName },
          { label: "Email", value: email, onChange: setEmail },
          { label: "Phone", value: phone, onChange: setPhone },
          { label: "Premise ID", value: premiseId, onChange: setPremiseId },
        ].map(f => (
          <div key={f.label} className="flex items-center gap-2">
            <span style={labelStyle}>{f.label}</span>
            <input type="text" value={f.value} onChange={e => f.onChange(e.target.value)} className={inputClass} style={{ fontSize: 16 }} />
          </div>
        ))}
        <div className="flex items-center gap-2">
          <span style={labelStyle}>Type</span>
          <select value={opType} onChange={e => setOpType(e.target.value)} className={inputClass} style={{ fontSize: 16 }}>
            <option>Cow-Calf</option>
            <option>Stocker</option>
            <option>Feedlot</option>
            <option>Seedstock</option>
            <option>Mixed</option>
          </select>
        </div>
      </div>

      <div className="rounded-xl px-3 py-3.5" style={{ backgroundColor: "white", border: "1px solid rgba(212,212,208,0.60)" }}>
        <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.10em", color: "rgba(26,26,26,0.35)", textTransform: "uppercase", marginBottom: 8 }}>ADDRESS</div>
        {[
          { label: "Street", value: "12480 Butte Creek Rd" },
          { label: "City", value: "Faith" },
          { label: "State", value: "SD" },
          { label: "Zip", value: "57626" },
        ].map(f => (
          <div key={f.label} className="flex items-center gap-2 mb-2">
            <span style={labelStyle}>{f.label}</span>
            <input type="text" defaultValue={f.value} className={inputClass} style={{ fontSize: 16 }} />
          </div>
        ))}
      </div>

      <button
        className="w-full rounded-full py-3.5 font-['Inter'] cursor-pointer active:scale-[0.97]"
        style={{ backgroundColor: "#0E2646", fontSize: 14, fontWeight: 700, color: "white", border: "none" }}
        onClick={() => showToast("success", "Settings saved")}
      >
        Save Changes
      </button>
    </div>
  );
};

export default ReferenceSettingsScreen;
