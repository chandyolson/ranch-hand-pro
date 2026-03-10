import React, { useState } from "react";
import { useChuteSideToast } from "@/components/ToastContext";
import { LABEL_STYLE, INPUT_CLS } from "@/lib/styles";

interface TeamMember {
  id: string;
  name: string;
  initials: string;
  role: "Admin" | "Operator" | "Veterinarian" | "Operation Member" | "Operation Guest";
  email: string;
  status: "active" | "pending";
}

const roleColors: Record<string, { color: string; bg: string }> = {
  "Admin":            { color: "#0E2646", bg: "rgba(14,38,70,0.10)" },
  "Operator":         { color: "#55BAAA", bg: "rgba(85,186,170,0.12)" },
  "Veterinarian":     { color: "#A8A8F0", bg: "rgba(168,168,240,0.12)" },
  "Operation Member": { color: "#F3D12A", bg: "rgba(243,209,42,0.12)" },
  "Operation Guest":  { color: "#A8A8A8", bg: "rgba(168,168,168,0.12)" },
};

const roleDescriptions: Record<string, string> = {
  "Admin": "Full access — all data, settings, team management",
  "Operator": "Same as Admin, different label",
  "Veterinarian": "View + edit animal data, cannot edit calving or settings",
  "Operation Member": "Full entry, no delete, no settings",
  "Operation Guest": "Read-only",
};

const roleOptions: TeamMember["role"][] = ["Admin", "Operator", "Veterinarian", "Operation Member", "Operation Guest"];

const ReferenceTeamScreen: React.FC = () => {
  const [members, setMembers] = useState<TeamMember[]>([
    { id: "m1", name: "J. Olson",      initials: "JO", role: "Admin",            email: "jolson@email.com",    status: "active" },
    { id: "m2", name: "T. Williams",   initials: "TW", role: "Operator",         email: "twilliams@email.com", status: "active" },
    { id: "m3", name: "Dr. Hendricks", initials: "DH", role: "Veterinarian",     email: "drhendricks@vet.com", status: "active" },
    { id: "m4", name: "R. Olson",      initials: "RO", role: "Operation Member", email: "rolson@email.com",    status: "pending" },
  ]);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<TeamMember["role"]>("Operation Member");
  const { showToast } = useChuteSideToast();

  const handleInvite = () => {
    if (!inviteEmail.trim()) { showToast("error", "Email is required"); return; }
    const initials = inviteEmail.slice(0, 2).toUpperCase();
    setMembers(prev => [...prev, { id: "m" + Date.now(), name: inviteEmail.split("@")[0], initials, role: inviteRole, email: inviteEmail.trim(), status: "pending" }]);
    showToast("success", "Invitation sent to " + inviteEmail.trim());
    setInviteEmail(""); setInviteRole("Operation Member"); setInviteOpen(false);
  };

  return (
    <div className="px-4 pt-4 pb-10 space-y-3">
      <div className="flex items-center justify-between">
        <span style={{ fontSize: 20, fontWeight: 800, color: "#0E2646" }}>Team</span>
        <button className="rounded-full h-9 px-4 flex items-center gap-1.5 cursor-pointer active:scale-[0.97]" style={{ backgroundColor: "#F3D12A", fontSize: 13, fontWeight: 700, color: "#1A1A1A", border: "none" }} onClick={() => setInviteOpen(true)}>
          <span style={{ fontSize: 16, fontWeight: 700, lineHeight: 1 }}>+</span> Invite
        </button>
      </div>

      {inviteOpen && (
        <div className="rounded-xl px-3 py-3.5 space-y-2" style={{ backgroundColor: "white", border: "2px solid #F3D12A" }}>
          <div className="flex items-center gap-2">
            <span style={LABEL_STYLE}>Email</span>
            <input type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder="Email address" className={INPUT_CLS} style={{ fontSize: 16 }} />
          </div>
          <div className="flex items-center gap-2">
            <span style={LABEL_STYLE}>Role</span>
            <select value={inviteRole} onChange={e => setInviteRole(e.target.value as TeamMember["role"])} className={INPUT_CLS} style={{ fontSize: 16 }}>
              {roleOptions.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div style={{ marginLeft: 104, fontSize: 12, color: "rgba(26,26,26,0.40)", fontStyle: "italic", marginTop: 4 }}>
            {roleDescriptions[inviteRole]}
          </div>
          <div className="flex gap-2 mt-1">
            <button className="flex-1 rounded-full py-2.5 border cursor-pointer active:scale-[0.97]" style={{ borderColor: "#D4D4D0", backgroundColor: "white", fontSize: 13, fontWeight: 600, color: "#0E2646" }} onClick={() => { setInviteOpen(false); setInviteEmail(""); }}>Cancel</button>
            <button className="flex-1 rounded-full py-2.5 cursor-pointer active:scale-[0.97]" style={{ backgroundColor: "#0E2646", fontSize: 13, fontWeight: 700, color: "white", border: "none" }} onClick={handleInvite}>Send Invite</button>
          </div>
        </div>
      )}

      <div className="rounded-xl px-3" style={{ backgroundColor: "white", border: "1px solid rgba(212,212,208,0.60)" }}>
        {members.map(m => {
          const rc = roleColors[m.role];
          return (
            <div key={m.id} className="flex items-center gap-3 py-3 border-b border-[rgba(26,26,26,0.06)] last:border-b-0">
              <div className="rounded-full flex items-center justify-center shrink-0" style={{ width: 36, height: 36, backgroundColor: "rgba(14,38,70,0.08)", fontSize: 12, fontWeight: 700, color: "#0E2646" }}>
                {m.initials}
              </div>
              <div className="flex-1 min-w-0">
                <div style={{ fontSize: 14, fontWeight: 700, color: "#1A1A1A" }}>{m.name}</div>
                <div className="truncate" style={{ fontSize: 12, color: "rgba(26,26,26,0.40)", marginTop: 2 }}>{m.email}</div>
              </div>
              <div className="flex flex-col items-end gap-1.5 shrink-0">
                <span className="rounded-full" style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.06em", padding: "2px 8px", backgroundColor: rc.bg, color: rc.color }}>{m.role.toUpperCase()}</span>
                {m.status === "pending" && (
                  <span className="rounded-full" style={{ fontSize: 9, fontWeight: 700, padding: "2px 8px", backgroundColor: "rgba(243,209,42,0.12)", color: "#B8960F" }}>PENDING</span>
                )}
                {m.role !== "Admin" && (
                  <button
                    className="w-7 h-7 rounded-lg flex items-center justify-center cursor-pointer active:scale-[0.95]"
                    style={{ backgroundColor: "rgba(212,24,61,0.06)", border: "none" }}
                    onClick={() => { setMembers(prev => prev.filter(x => x.id !== m.id)); showToast("success", m.name + " removed"); }}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#d4183d" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ReferenceTeamScreen;