import React, { useState } from "react";
import { useChuteSideToast } from "@/components/ToastContext";
import { LABEL_STYLE, INPUT_CLS } from "@/lib/styles";
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOperation } from '@/contexts/OperationContext';

const roleColors: Record<string, { color: string; bg: string }> = {
  "admin":            { color: "#0E2646", bg: "rgba(14,38,70,0.10)" },
  "operator":         { color: "#55BAAA", bg: "rgba(85,186,170,0.12)" },
  "veterinarian":     { color: "#A8A8F0", bg: "rgba(168,168,240,0.12)" },
  "member":           { color: "#F3D12A", bg: "rgba(243,209,42,0.12)" },
  "guest":            { color: "#A8A8A8", bg: "rgba(168,168,168,0.12)" },
};

const roleLabels: Record<string, string> = {
  "admin": "Admin",
  "operator": "Operator",
  "veterinarian": "Veterinarian",
  "member": "Operation Member",
  "guest": "Operation Guest",
};

const roleDescriptions: Record<string, string> = {
  "admin": "Full access — all data, settings, team management",
  "operator": "Same as Admin, different label",
  "veterinarian": "View + edit animal data, cannot edit calving or settings",
  "member": "Full entry, no delete, no settings",
  "guest": "Read-only",
};

const roleOptions = ["admin", "operator", "veterinarian", "member", "guest"];

const ReferenceTeamScreen: React.FC = () => {
  const { operationId } = useOperation();
  const queryClient = useQueryClient();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("member");
  const { showToast } = useChuteSideToast();

  const { data: teamMembers, isLoading } = useQuery({
    queryKey: ['team', operationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('operation_teams')
        .select('*, profile:user_profiles(display_name, avatar_url, phone)')
        .eq('operation_id', operationId);
      if (error) throw error;
      return data;
    },
  });

  const { data: pendingInvites } = useQuery({
    queryKey: ['invitations', operationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pending_invitations')
        .select('*')
        .eq('operation_id', operationId)
        .eq('status', 'pending');
      if (error) throw error;
      return data;
    },
  });

  const handleInvite = async () => {
    const email = inviteEmail.trim().toLowerCase();
    if (!email) { showToast("error", "Email is required"); return; }
    const { error } = await supabase.from('pending_invitations').insert({
      operation_id: operationId,
      invited_email: email,
      user_type: inviteRole,
      invited_by: '00000000-0000-0000-0000-000000000000',
    });
    if (error) { showToast("error", error.message); return; }
    queryClient.invalidateQueries({ queryKey: ['invitations'] });
    showToast("success", "Invitation sent to " + email);
    setInviteEmail(""); setInviteRole("member"); setInviteOpen(false);
  };

  const handleRemoveMember = async (id: string, name: string) => {
    const { error } = await supabase.from('operation_teams').delete().eq('id', id);
    if (error) { showToast("error", error.message); return; }
    queryClient.invalidateQueries({ queryKey: ['team'] });
    showToast("success", name + " removed");
  };

  const handleCancelInvite = async (id: string, email: string) => {
    const { error } = await supabase.from('pending_invitations').delete().eq('id', id);
    if (error) { showToast("error", error.message); return; }
    queryClient.invalidateQueries({ queryKey: ['invitations'] });
    showToast("success", "Invitation to " + email + " cancelled");
  };

  const getInitials = (name: string) => name.replace(/[^a-zA-Z ]/g, '').split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase() || '??';

  const members = (teamMembers || []).map(m => {
    const name = m.display_name || (m.profile as any)?.display_name || 'Unknown';
    return {
      id: m.id,
      name,
      initials: getInitials(name),
      role: m.user_type || 'member',
    };
  });

  return (
    <div className="px-4 pt-4 pb-10 space-y-3">
      <div className="flex items-center justify-between">
        <span style={{ fontSize: 20, fontWeight: 800, color: "#0E2646" }}>Team</span>
        <button className="flex items-center justify-center cursor-pointer active:scale-[0.95]" style={{ width: 36, height: 36, borderRadius: 9999, backgroundColor: "#F3D12A", border: "none", fontSize: 20, fontWeight: 700, color: "#1A1A1A", lineHeight: 1 }} onClick={() => setInviteOpen(true)}>+</button>
      </div>

      {inviteOpen && (
        <div className="rounded-xl px-3 py-3.5 space-y-2" style={{ backgroundColor: "white", border: "2px solid #F3D12A" }}>
          <div className="flex items-center gap-2">
            <span style={LABEL_STYLE}>Email</span>
            <input type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder="Email address" className={INPUT_CLS} style={{ fontSize: 16 }} />
          </div>
          <div className="flex items-center gap-2">
            <span style={LABEL_STYLE}>Role</span>
            <select value={inviteRole} onChange={e => setInviteRole(e.target.value)} className={INPUT_CLS} style={{ fontSize: 16 }}>
              {roleOptions.map(r => <option key={r} value={r}>{roleLabels[r]}</option>)}
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
        {isLoading ? (
          <div className="py-6 text-center" style={{ fontSize: 13, color: "rgba(26,26,26,0.4)" }}>Loading…</div>
        ) : members.length === 0 && !(pendingInvites || []).length ? (
          <div className="py-6 text-center" style={{ fontSize: 13, color: "rgba(26,26,26,0.4)" }}>No team members yet</div>
        ) : (
          <>
            {members.map(m => {
              const rc = roleColors[m.role] || roleColors.member;
              return (
                <div key={m.id} className="flex items-center gap-3 py-3 border-b border-[rgba(26,26,26,0.06)] last:border-b-0">
                  <div className="rounded-full flex items-center justify-center shrink-0" style={{ width: 36, height: 36, backgroundColor: "rgba(14,38,70,0.08)", fontSize: 12, fontWeight: 700, color: "#0E2646" }}>
                    {m.initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div style={{ fontSize: 14, fontWeight: 700, color: "#1A1A1A" }}>{m.name}</div>
                  </div>
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <span className="rounded-full" style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.06em", padding: "2px 8px", backgroundColor: rc.bg, color: rc.color }}>{(roleLabels[m.role] || m.role).toUpperCase()}</span>
                    {m.role !== "admin" && (
                      <button
                        className="w-7 h-7 rounded-lg flex items-center justify-center cursor-pointer active:scale-[0.95]"
                        style={{ backgroundColor: "rgba(212,24,61,0.06)", border: "none" }}
                        onClick={() => handleRemoveMember(m.id, m.name)}
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

            {(pendingInvites || []).length > 0 && (
              <>
                <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(26,26,26,0.35)", letterSpacing: "0.08em", paddingTop: 12, paddingBottom: 4 }}>PENDING INVITATIONS</div>
                {(pendingInvites || []).map(inv => {
                  const rc = roleColors[inv.user_type] || roleColors.member;
                  return (
                    <div key={inv.id} className="flex items-center gap-3 py-3 border-b border-[rgba(26,26,26,0.06)] last:border-b-0">
                      <div className="rounded-full flex items-center justify-center shrink-0" style={{ width: 36, height: 36, backgroundColor: "rgba(243,209,42,0.10)", fontSize: 12, fontWeight: 700, color: "#B8960F" }}>
                        ✉
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="truncate" style={{ fontSize: 14, fontWeight: 600, color: "#1A1A1A" }}>{inv.invited_email}</div>
                      </div>
                      <div className="flex flex-col items-end gap-1.5 shrink-0">
                        <span className="rounded-full" style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.06em", padding: "2px 8px", backgroundColor: rc.bg, color: rc.color }}>{(roleLabels[inv.user_type] || inv.user_type).toUpperCase()}</span>
                        <span className="rounded-full" style={{ fontSize: 9, fontWeight: 700, padding: "2px 8px", backgroundColor: "rgba(243,209,42,0.12)", color: "#B8960F" }}>PENDING</span>
                        <button
                          className="w-7 h-7 rounded-lg flex items-center justify-center cursor-pointer active:scale-[0.95]"
                          style={{ backgroundColor: "rgba(212,24,61,0.06)", border: "none" }}
                          onClick={() => handleCancelInvite(inv.id, inv.invited_email)}
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#d4183d" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default ReferenceTeamScreen;
