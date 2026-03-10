import React, { useState } from "react";
import { useChuteSideToast } from "@/components/ToastContext";
import ReferenceItemRow from "@/components/ReferenceItemRow";

const labelStyle: React.CSSProperties = { width: 96, flexShrink: 0, fontSize: 14, fontWeight: 600, color: "#1A1A1A" };
const inputClass = "flex-1 h-10 rounded-lg border border-[#D4D4D0] bg-white px-3 outline-none font-['Inter'] transition-all focus:border-[#F3D12A] focus:ring-2 focus:ring-[#F3D12A]/25";

const roleConfig: Record<string, { label: string; color: string; bg: string }> = {
  owner:   { label: "Owner",   color: "#F3D12A", bg: "rgba(243,209,42,0.12)" },
  manager: { label: "Manager", color: "#55BAAA", bg: "rgba(85,186,170,0.12)" },
  hand:    { label: "Hand",    color: "#A8A8F0", bg: "rgba(168,168,240,0.12)" },
  vet:     { label: "Vet",     color: "#E8A0BF", bg: "rgba(232,160,191,0.12)" },
};

const ReferenceTeamScreen: React.FC = () => {
  const [members, setMembers] = useState([
    { id: "m1", name: "Jake Owens",      email: "jake@saddlebutte.com",  role: "owner" },
    { id: "m2", name: "Tom Wheeler",     email: "tom@saddlebutte.com",   role: "manager" },
    { id: "m3", name: "Cody Jensen",     email: "cody@saddlebutte.com",  role: "hand" },
    { id: "m4", name: "Dr. Hendricks",   email: "hendricks@prairievet.com", role: "vet" },
  ]);
  const [addOpen, setAddOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newRole, setNewRole] = useState("hand");
  const { showToast } = useChuteSideToast();

  const handleAdd = () => {
    if (!newName.trim() || !newEmail.trim()) { showToast("error", "Name and email required"); return; }
    setMembers(prev => [...prev, { id: "m" + Date.now(), name: newName.trim(), email: newEmail.trim(), role: newRole }]);
    showToast("success", newName.trim() + " invited");
    setNewName(""); setNewEmail(""); setNewRole("hand"); setAddOpen(false);
  };

  return (
    <div className="px-4 pt-4 pb-10 space-y-3 font-['Inter']">
      <div className="flex items-center justify-between">
        <span style={{ fontSize: 20, fontWeight: 800, color: "#0E2646" }}>Team</span>
        <button className="rounded-full h-9 px-4 flex items-center gap-1.5 cursor-pointer active:scale-[0.97] font-['Inter']" style={{ backgroundColor: "#F3D12A", fontSize: 13, fontWeight: 700, color: "#1A1A1A", border: "none" }} onClick={() => setAddOpen(true)}>
          <span style={{ fontSize: 16, fontWeight: 700, lineHeight: 1 }}>+</span> Invite
        </button>
      </div>

      {addOpen && (
        <div className="rounded-xl px-3 py-3.5 space-y-2 font-['Inter']" style={{ backgroundColor: "white", border: "2px solid #F3D12A" }}>
          <div className="flex items-center gap-2">
            <span style={labelStyle}>Name</span>
            <input type="text" value={newName} onChange={e => setNewName(e.target.value)} placeholder="Full name" className={inputClass} style={{ fontSize: 16 }} />
          </div>
          <div className="flex items-center gap-2">
            <span style={labelStyle}>Email</span>
            <input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="Email address" className={inputClass} style={{ fontSize: 16 }} />
          </div>
          <div className="flex items-center gap-2">
            <span style={labelStyle}>Role</span>
            <select value={newRole} onChange={e => setNewRole(e.target.value)} className={inputClass} style={{ fontSize: 16 }}>
              {Object.entries(roleConfig).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>
          <div className="flex gap-2 mt-1">
            <button className="flex-1 rounded-full py-2.5 border font-['Inter'] cursor-pointer active:scale-[0.97]" style={{ borderColor: "#D4D4D0", backgroundColor: "white", fontSize: 13, fontWeight: 600, color: "#0E2646" }} onClick={() => { setAddOpen(false); setNewName(""); setNewEmail(""); }}>Cancel</button>
            <button className="flex-1 rounded-full py-2.5 font-['Inter'] cursor-pointer active:scale-[0.97]" style={{ backgroundColor: "#0E2646", fontSize: 13, fontWeight: 700, color: "white", border: "none" }} onClick={handleAdd}>Send Invite</button>
          </div>
        </div>
      )}

      <div className="rounded-xl px-3" style={{ backgroundColor: "white", border: "1px solid rgba(212,212,208,0.60)" }}>
        {members.map(m => {
          const rc = roleConfig[m.role];
          return (
            <ReferenceItemRow
              key={m.id}
              label={m.name}
              sublabel={m.email}
              badge={rc ? { text: rc.label, bg: rc.bg, color: rc.color } : undefined}
              onEdit={() => showToast("info", "Edit " + m.name)}
              onDelete={() => { setMembers(prev => prev.filter(x => x.id !== m.id)); showToast("success", m.name + " removed"); }}
            />
          );
        })}
      </div>
    </div>
  );
};

export default ReferenceTeamScreen;
