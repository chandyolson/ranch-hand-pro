import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOperation } from "@/contexts/OperationContext";
import { useChuteSideToast } from "@/components/ToastContext";
import FlagIcon from "@/components/FlagIcon";
import { Skeleton } from "@/components/ui/skeleton";
import { LABEL_STYLE, INPUT_CLS } from "@/lib/styles";
import type { FlagColor } from "@/lib/constants";

const CATTLE_TYPES = ["Cows", "Bulls", "Calves", "Heifers", "Mixed", "All"];
const GROUP_TYPES = ["general", "calving", "pasture", "sale", "breeding", "feedlot"];
const GROUP_TYPE_LABELS: Record<string, string> = { general: "General", calving: "Calving", pasture: "Pasture", sale: "Sale", breeding: "Breeding", feedlot: "Feedlot" };

const fmtDate = (d: string) => new Date(d + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
const fmtShort = (d: string) => new Date(d + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });
const fmtMonthYear = (d: string) => {
  const dt = new Date(d + "T00:00:00");
  return dt.toLocaleDateString("en-US", { month: "short", year: "numeric" });
};

const tierToColor: Record<string, FlagColor> = { management: "teal", production: "gold", cull: "red" };

export default function ReferenceGroupDetailScreen() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { operationId } = useOperation();
  const { showToast } = useChuteSideToast();
  const queryClient = useQueryClient();

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<"members" | "history" | "inventory">("members");
  const [showPast, setShowPast] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [cattleType, setCattleType] = useState("Cows");
  const [groupType, setGroupType] = useState("general");
  const [isActive, setIsActive] = useState(true);
  const [initialized, setInitialized] = useState(false);

  // ── Group record ──
  const { data: group, isLoading } = useQuery({
    queryKey: ["group-detail", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("groups").select("*").eq("id", id!).single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  // Sync edit fields once
  if (group && !initialized) {
    setName(group.name);
    setDescription(group.description || "");
    setCattleType(group.cattle_type);
    setGroupType(group.group_type || "general");
    setIsActive(group.is_active);
    setInitialized(true);
  }

  // ── Current members ──
  const { data: currentMembers } = useQuery({
    queryKey: ["group-current-members", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("animal_groups")
        .select("id, animal_id, start_date, animals!inner(id, tag, tag_color, breed, type, sex, year_born, status)")
        .eq("group_id", id!).eq("operation_id", operationId).is("end_date", null)
        .order("start_date", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!id,
  });

  // ── Past members ──
  const { data: pastMembers } = useQuery({
    queryKey: ["group-past-members", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("animal_groups")
        .select("id, animal_id, start_date, end_date, source, animals!inner(id, tag, breed, type, year_born)")
        .eq("group_id", id!).eq("operation_id", operationId).not("end_date", "is", null)
        .order("end_date", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!id,
  });

  // ── Flags for current members ──
  const memberIds = (currentMembers || []).map((m) => m.animal_id);
  const { data: memberFlags } = useQuery({
    queryKey: ["group-member-flags", id, memberIds.length],
    queryFn: async () => {
      if (!memberIds.length) return {};
      const { data } = await supabase.from("animal_flags").select("animal_id, flag_tier, flag_name")
        .in("animal_id", memberIds).eq("operation_id", operationId).is("resolved_at", null);
      const map: Record<string, { color: FlagColor; name: string }[]> = {};
      (data || []).forEach((f: any) => {
        if (!map[f.animal_id]) map[f.animal_id] = [];
        map[f.animal_id].push({ color: tierToColor[f.flag_tier] || "teal", name: f.flag_name || "" });
      });
      return map;
    },
    enabled: memberIds.length > 0,
  });

  // ── Last work date per member ──
  const { data: memberWorkDates } = useQuery({
    queryKey: ["group-member-work-dates", id, memberIds.length],
    queryFn: async () => {
      if (!memberIds.length) return {};
      const { data } = await supabase.from("cow_work").select("animal_id, created_at")
        .in("animal_id", memberIds).eq("operation_id", operationId).order("created_at", { ascending: false });
      const map: Record<string, string> = {};
      (data || []).forEach((w: any) => { if (!map[w.animal_id]) map[w.animal_id] = w.created_at; });
      return map;
    },
    enabled: memberIds.length > 0,
  });

  // ── Last calving date per member ──
  const { data: memberCalvDates } = useQuery({
    queryKey: ["group-member-calv-dates", id, memberIds.length],
    queryFn: async () => {
      if (!memberIds.length) return {};
      const { data } = await supabase.from("calving_records").select("dam_id, calving_date")
        .in("dam_id", memberIds).eq("operation_id", operationId).order("calving_date", { ascending: false });
      const map: Record<string, string> = {};
      (data || []).forEach((c: any) => { if (!map[c.dam_id]) map[c.dam_id] = c.calving_date; });
      return map;
    },
    enabled: memberIds.length > 0,
  });

  // ── Projects using this group ──
  const { data: groupProjects } = useQuery({
    queryKey: ["group-projects", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("projects")
        .select("id, name, project_date, head_count, status, work_types:project_work_types(work_type:work_types(code, name))")
        .eq("group_id", id!).eq("operation_id", operationId).order("project_date", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!id,
  });

  // ── Calving count ──
  const { data: calvingCount } = useQuery({
    queryKey: ["group-calving-count", id],
    queryFn: async () => {
      const { count } = await supabase.from("calving_records").select("id", { count: "exact", head: true }).eq("group_id", id!);
      return count || 0;
    },
    enabled: !!id,
  });

  // ── All time member count ──
  const { data: allTimeCount } = useQuery({
    queryKey: ["group-all-time-count", id],
    queryFn: async () => {
      const { count } = await supabase.from("animal_groups").select("id", { count: "exact", head: true }).eq("group_id", id!).eq("operation_id", operationId);
      return count || 0;
    },
    enabled: !!id,
  });

  // ── Membership records for inventory ──
  const { data: allMemberships } = useQuery({
    queryKey: ["group-all-memberships", id],
    queryFn: async () => {
      const { data } = await supabase.from("animal_groups").select("start_date, end_date, source")
        .eq("group_id", id!).eq("operation_id", operationId).order("start_date", { ascending: true });
      return data || [];
    },
    enabled: !!id && activeTab === "inventory",
  });

  const handleSave = async () => {
    if (!name.trim()) { showToast("error", "Name is required"); return; }
    setSaving(true);
    try {
      const updateObj = { name: name.trim(), description: description.trim() || null, cattle_type: cattleType, is_active: isActive, group_type: groupType };
      const { error } = await supabase.from("groups").update(updateObj).eq("id", id!);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["groups"] });
      queryClient.invalidateQueries({ queryKey: ["group-detail", id] });
      showToast("success", "Group updated");
      setEditing(false);
    } catch (err: any) {
      showToast("error", err.message || "Failed to update");
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    try {
      const { error } = await supabase.from("groups").delete().eq("id", id!);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["groups"] });
      showToast("success", "Group deleted");
      navigate("/reference/groups");
    } catch (err: any) { showToast("error", err.message || "Failed to delete"); }
  };

  const handleCancel = () => {
    if (group) {
      setName(group.name); setDescription(group.description || "");
      setCattleType(group.cattle_type); setGroupType(group.group_type || "general");
      setIsActive(group.is_active);
    }
    setEditing(false);
  };

  // ── Inventory calculations ──
  const computeInventory = () => {
    if (!allMemberships?.length) return [];
    const months: Record<string, { added: number; removed: number }> = {};
    allMemberships.forEach((m: any) => {
      const sk = m.start_date?.slice(0, 7);
      if (sk) { if (!months[sk]) months[sk] = { added: 0, removed: 0 }; months[sk].added++; }
      if (m.end_date) { const ek = m.end_date.slice(0, 7); if (!months[ek]) months[ek] = { added: 0, removed: 0 }; months[ek].removed++; }
    });
    return Object.entries(months).sort(([a], [b]) => b.localeCompare(a)).map(([key, val]) => ({
      month: key, label: fmtMonthYear(key + "-01"), added: val.added, removed: val.removed, net: val.added - val.removed,
    }));
  };

  if (isLoading) return (
    <div className="px-4 pt-4 pb-10 space-y-3">
      <Skeleton className="h-8 w-48 rounded-lg" style={{ backgroundColor: "rgba(14,38,70,0.10)" }} />
      <Skeleton className="h-[160px] rounded-xl" style={{ backgroundColor: "rgba(14,38,70,0.10)" }} />
    </div>
  );

  if (!group) return (
    <div className="px-4 pt-4 pb-10 text-center" style={{ paddingTop: 48 }}>
      <p style={{ fontSize: 15, fontWeight: 600, color: "rgba(26,26,26,0.40)" }}>Group not found</p>
      <button onClick={() => navigate("/reference/groups")} className="mt-3 rounded-full px-5 py-2 cursor-pointer" style={{ backgroundColor: "#0E2646", color: "white", fontSize: 13, fontWeight: 600, border: "none" }}>Back to Groups</button>
    </div>
  );

  const createdDate = group.created_at ? fmtDate(group.created_at.slice(0, 10)) : "";
  const gType = GROUP_TYPE_LABELS[group.group_type] || "General";
  const currentCount = currentMembers?.length || 0;
  const inventory = computeInventory();

  return (
    <div className="px-4 pt-1 pb-10 space-y-0">

      {/* ═══ GRADIENT HEADER ═══ */}
      <div style={{ borderRadius: 14, padding: "14px 16px", marginTop: 6, background: "linear-gradient(145deg, #0E2646 0%, #163A5E 55%, #55BAAA 100%)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: 22, fontWeight: 700, color: "#FFFFFF" }}>{group.name}</span>
          <div style={{ display: "flex", gap: 4 }}>
            <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 8px", borderRadius: 10, letterSpacing: "0.04em", background: "rgba(255,255,255,0.15)", color: "#A8E6DA" }}>{gType.toUpperCase()}</span>
            <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 8px", borderRadius: 10, letterSpacing: "0.04em", background: group.is_active ? "rgba(85,186,170,0.25)" : "rgba(155,35,53,0.25)", color: group.is_active ? "#A8E6DA" : "#F0A0A0" }}>{group.is_active ? "ACTIVE" : "INACTIVE"}</span>
          </div>
        </div>
        <div style={{ fontSize: 12, color: "rgba(240,240,240,0.5)", marginTop: 4 }}>{group.cattle_type}{createdDate ? ` · Created ${createdDate}` : ""}</div>
        {group.description && <div style={{ fontSize: 12, color: "rgba(240,240,240,0.4)", marginTop: 6, fontStyle: "italic" }}>{group.description}</div>}
        {!editing && (
          <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
            <button onClick={() => setEditing(true)} style={{ fontSize: 11, fontWeight: 600, color: "#A8E6DA", background: "rgba(255,255,255,0.10)", border: "none", borderRadius: 20, padding: "4px 12px", cursor: "pointer" }}>Edit</button>
            <button onClick={handleDelete} style={{ fontSize: 11, fontWeight: 600, color: "#F0A0A0", background: "rgba(255,255,255,0.08)", border: "none", borderRadius: 20, padding: "4px 12px", cursor: "pointer" }}>Delete</button>
          </div>
        )}
      </div>

      {/* ═══ EDIT MODE ═══ */}
      {editing && (
        <div style={{ background: "#fff", border: "1px solid #D4D4D0", borderRadius: 12, padding: 12, marginTop: 10 }}>
          <div style={{ display: "flex", flexDirection: "column" as const, gap: 8 }}>
            {[
              { label: "Name", value: name, onChange: (v: string) => setName(v), type: "text" },
              { label: "Description", value: description, onChange: (v: string) => setDescription(v), type: "text", placeholder: "Optional note" },
            ].map(f => (
              <div key={f.label} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ ...LABEL_STYLE, width: 85, flexShrink: 0 }}>{f.label}</span>
                <input type="text" value={f.value} onChange={e => f.onChange(e.target.value)} placeholder={f.placeholder || ""} className={INPUT_CLS} style={{ fontSize: 16 }} />
              </div>
            ))}
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ ...LABEL_STYLE, width: 85, flexShrink: 0 }}>Cattle Type</span>
              <select value={cattleType} onChange={e => setCattleType(e.target.value)} className={INPUT_CLS} style={{ fontSize: 16 }}>
                {CATTLE_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ ...LABEL_STYLE, width: 85, flexShrink: 0 }}>Group Type</span>
              <select value={groupType} onChange={e => setGroupType(e.target.value)} className={INPUT_CLS} style={{ fontSize: 16 }}>
                {GROUP_TYPES.map(t => <option key={t} value={t}>{GROUP_TYPE_LABELS[t]}</option>)}
              </select>
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "4px 0" }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: "#1A1A1A" }}>Active</span>
              <button onClick={() => setIsActive(!isActive)} style={{ width: 44, height: 24, borderRadius: 12, border: "none", cursor: "pointer", position: "relative" as const, background: isActive ? "#55BAAA" : "rgba(26,26,26,0.15)" }}>
                <span style={{ position: "absolute" as const, width: 16, height: 16, borderRadius: "50%", background: "#fff", top: 4, left: isActive ? 24 : 4, transition: "left 0.2s" }} />
              </button>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
            <button onClick={handleCancel} style={{ flex: 1, padding: "10px 0", borderRadius: 20, border: "1px solid #D4D4D0", background: "#fff", fontSize: 13, fontWeight: 600, color: "#0E2646", cursor: "pointer" }}>Cancel</button>
            <button onClick={handleSave} disabled={saving} style={{ flex: 2, padding: "10px 0", borderRadius: 20, border: "none", background: "#F3D12A", fontSize: 13, fontWeight: 700, color: "#1A1A1A", cursor: "pointer", opacity: saving ? 0.5 : 1 }}>{saving ? "Saving..." : "Save"}</button>
          </div>
        </div>
      )}

      {/* ═══ STATS ═══ */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 6, marginTop: 10 }}>
        {[
          { val: currentCount, lbl: "Current" },
          { val: allTimeCount ?? "-", lbl: "All Time" },
          { val: groupProjects?.length || 0, lbl: "Projects" },
          { val: calvingCount ?? "-", lbl: "Calvings" },
        ].map(s => (
          <div key={s.lbl} style={{ background: "#fff", border: "1px solid #D4D4D0", borderRadius: 8, padding: "8px 6px", textAlign: "center" as const }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: "#0E2646" }}>{s.val}</div>
            <div style={{ fontSize: 9, fontWeight: 600, color: "rgba(26,26,26,0.35)", textTransform: "uppercase" as const, letterSpacing: "0.04em", marginTop: 2 }}>{s.lbl}</div>
          </div>
        ))}
      </div>

      {/* ═══ TABS ═══ */}
      <div style={{ display: "flex", marginTop: 12, borderBottom: "1px solid rgba(26,26,26,0.08)" }}>
        {(["members", "history", "inventory"] as const).map(t => (
          <button key={t} onClick={() => setActiveTab(t)} style={{ flex: 1, textAlign: "center" as const, padding: "10px 0", fontSize: 13, fontWeight: 600, cursor: "pointer", color: activeTab === t ? "#0E2646" : "rgba(26,26,26,0.35)", background: "transparent", border: "none", borderBottom: activeTab === t ? "2px solid #F3D12A" : "2px solid transparent" }}>
            {t === "members" ? "Members" : t === "history" ? "History" : "Inventory"}
          </button>
        ))}
      </div>

      {/* ═══ MEMBERS TAB ═══ */}
      {activeTab === "members" && (
        <div style={{ paddingTop: 10 }}>
          <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.08em", color: "rgba(26,26,26,0.3)", textTransform: "uppercase" as const, marginBottom: 6 }}>Current members ({currentCount})</div>
          {currentMembers && currentMembers.length > 0 ? currentMembers.map((m: any) => {
            const a = m.animals;
            const flags = memberFlags?.[m.animal_id] || [];
            const lastWork = memberWorkDates?.[m.animal_id];
            const lastCalv = memberCalvDates?.[m.animal_id];
            return (
              <div key={m.id} onClick={() => navigate("/animals/" + a.id)} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 0", borderBottom: "1px solid rgba(26,26,26,0.06)", cursor: "pointer" }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: "#0E2646", minWidth: 48 }}>{a.tag}</span>
                <span style={{ fontSize: 11, color: "rgba(26,26,26,0.5)", flex: 1 }}>
                  {a.breed || "-"} · {a.type} · {a.year_born || "-"}
                  {flags.length > 0 && flags.map((f: any, i: number) => (
                    <span key={i} style={{ marginLeft: 4, display: "inline-flex", verticalAlign: "middle" }}><FlagIcon color={f.color} size="sm" /></span>
                  ))}
                </span>
                <span style={{ fontSize: 10, color: "rgba(26,26,26,0.35)", textAlign: "right" as const, whiteSpace: "nowrap" as const }}>
                  {lastWork ? `Wk ${fmtShort(lastWork.slice(0, 10))}` : "Wk -"} · {lastCalv ? `Calv ${fmtShort(lastCalv)}` : "Calv -"}
                </span>
              </div>
            );
          }) : <p style={{ fontSize: 13, color: "rgba(26,26,26,0.35)", textAlign: "center" as const, padding: "20px 0" }}>No current members</p>}

          {pastMembers && pastMembers.length > 0 && (<>
            <div onClick={() => setShowPast(!showPast)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0", cursor: "pointer", marginTop: 8, borderTop: "1px solid rgba(26,26,26,0.08)" }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: "rgba(26,26,26,0.4)" }}>Past members ({pastMembers.length})</span>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ transform: showPast ? "rotate(180deg)" : "rotate(0)", transition: "transform 150ms" }}><path d="M3 4.5L6 7.5L9 4.5" stroke="rgba(26,26,26,0.3)" strokeWidth="1.5" strokeLinecap="round" /></svg>
            </div>
            {showPast && pastMembers.map((m: any) => {
              const a = m.animals;
              const reason = m.source || "Removed";
              const rc: Record<string, { bg: string; text: string }> = { sold: { bg: "rgba(243,209,42,0.12)", text: "#B8860B" }, moved: { bg: "rgba(85,186,170,0.12)", text: "#0F6E56" }, died: { bg: "rgba(155,35,53,0.1)", text: "#9B2335" } };
              const c = rc[reason.toLowerCase()] || { bg: "rgba(26,26,26,0.06)", text: "rgba(26,26,26,0.45)" };
              return (
                <div key={m.id} onClick={() => navigate("/animals/" + a.id)} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", borderBottom: "1px solid rgba(26,26,26,0.04)", cursor: "pointer" }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "rgba(26,26,26,0.4)", minWidth: 48 }}>{a.tag}</span>
                  <span style={{ fontSize: 10, color: "rgba(26,26,26,0.35)", flex: 1 }}>{a.breed || "-"} · {a.type} · {a.year_born || "-"}</span>
                  <span style={{ fontSize: 10, color: "rgba(26,26,26,0.3)" }}>Left {m.end_date ? fmtDate(m.end_date) : "-"}</span>
                  <span style={{ fontSize: 9, fontWeight: 600, padding: "1px 6px", borderRadius: 8, background: c.bg, color: c.text, marginLeft: 4 }}>{reason}</span>
                </div>
              );
            })}
          </>)}
        </div>
      )}

      {/* ═══ HISTORY TAB ═══ */}
      {activeTab === "history" && (
        <div style={{ paddingTop: 10 }}>
          {groupProjects && groupProjects.length > 0 ? groupProjects.map((p: any) => {
            const code = p.work_types?.[0]?.work_type?.code || "WORK";
            const wtName = p.work_types?.[0]?.work_type?.name || code;
            const bc: Record<string, { bg: string; text: string }> = { PREG: { bg: "rgba(85,186,170,0.12)", text: "#0F6E56" }, BREED: { bg: "rgba(232,160,191,0.12)", text: "#993556" }, VAX: { bg: "rgba(243,209,42,0.12)", text: "#B8860B" }, AI: { bg: "rgba(232,160,191,0.12)", text: "#993556" } };
            const c = bc[code] || { bg: "rgba(26,26,26,0.06)", text: "rgba(26,26,26,0.45)" };
            return (
              <div key={p.id} onClick={() => navigate("/cow-work/" + p.id)} style={{ background: "rgba(26,26,26,0.03)", border: "1px solid rgba(26,26,26,0.06)", borderRadius: 8, padding: "10px 12px", marginBottom: 6, cursor: "pointer" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 8, letterSpacing: "0.04em", background: c.bg, color: c.text }}>{code}</span>
                    <span style={{ fontSize: 12, fontWeight: 500, color: "rgba(26,26,26,0.55)" }}>{wtName}</span>
                  </div>
                  <span style={{ fontSize: 11, color: "rgba(26,26,26,0.4)" }}>{p.project_date ? fmtDate(p.project_date) : "-"}</span>
                </div>
                <div style={{ fontSize: 12, color: "rgba(26,26,26,0.55)", marginTop: 4 }}>
                  <span style={{ fontWeight: 600, color: "#1A1A1A" }}>{p.name}</span>{p.head_count ? ` · ${p.head_count} head` : ""}
                </div>
              </div>
            );
          }) : <p style={{ fontSize: 13, color: "rgba(26,26,26,0.35)", textAlign: "center" as const, padding: "20px 0" }}>No project history</p>}
          {(calvingCount || 0) > 0 && (
            <div style={{ background: "rgba(26,26,26,0.03)", border: "1px solid rgba(26,26,26,0.06)", borderRadius: 8, padding: "10px 12px", marginBottom: 6 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 8, letterSpacing: "0.04em", background: "rgba(232,160,191,0.12)", color: "#993556" }}>CALVING</span>
              </div>
              <div style={{ fontSize: 12, color: "rgba(26,26,26,0.55)", marginTop: 4 }}><span style={{ fontWeight: 600, color: "#1A1A1A" }}>{calvingCount} calving records</span> linked to this group</div>
            </div>
          )}
        </div>
      )}

      {/* ═══ INVENTORY TAB ═══ */}
      {activeTab === "inventory" && (
        <div style={{ paddingTop: 10 }}>
          <div style={{ background: "#fff", border: "1px solid #D4D4D0", borderRadius: 10, padding: 12, marginBottom: 10 }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: "rgba(26,26,26,0.35)", textTransform: "uppercase" as const, letterSpacing: "0.06em", marginBottom: 8 }}>Head count: {currentCount} current</div>
            {inventory.length > 0 ? (
              <>
                <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 80, borderBottom: "1px solid rgba(26,26,26,0.08)", paddingBottom: 4 }}>
                  {inventory.slice(0, 8).reverse().map((m) => {
                    const maxVal = Math.max(...inventory.slice(0, 8).map(x => x.added + x.removed), 1);
                    const h = Math.max(((m.added + m.removed) / maxVal) * 60, 4);
                    return (
                      <div key={m.month} style={{ flex: 1, display: "flex", flexDirection: "column" as const, alignItems: "center" }}>
                        <div style={{ width: "80%", height: h, borderRadius: "3px 3px 0 0", background: m.net >= 0 ? "rgba(85,186,170,0.35)" : "rgba(155,35,53,0.25)" }} />
                      </div>
                    );
                  })}
                </div>
                <div style={{ display: "flex", gap: 4, marginTop: 4 }}>
                  {inventory.slice(0, 8).reverse().map(m => (
                    <div key={m.month} style={{ flex: 1, textAlign: "center" as const }}><span style={{ fontSize: 9, color: "rgba(26,26,26,0.3)" }}>{m.label.split(" ")[0]}</span></div>
                  ))}
                </div>
              </>
            ) : <p style={{ fontSize: 12, color: "rgba(26,26,26,0.35)", textAlign: "center" as const, padding: "16px 0" }}>No movement data</p>}
          </div>

          <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.08em", color: "rgba(26,26,26,0.3)", textTransform: "uppercase" as const, marginBottom: 6 }}>Monthly changes</div>
          {inventory.length > 0 ? inventory.map(m => (
            <div key={m.month} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid rgba(26,26,26,0.04)", fontSize: 12 }}>
              <span style={{ fontWeight: 600, color: "#1A1A1A", minWidth: 70 }}>{m.label}</span>
              <span style={{ color: "rgba(26,26,26,0.5)", flex: 1, textAlign: "right" as const }}>{m.added > 0 ? `+${m.added} added` : "+0"} · {m.removed > 0 ? `-${m.removed} removed` : "-0"}</span>
              <span style={{ fontWeight: 700, minWidth: 50, textAlign: "right" as const, color: m.net > 0 ? "#0F6E56" : m.net < 0 ? "#9B2335" : "rgba(26,26,26,0.3)" }}>{m.net > 0 ? `+${m.net}` : m.net === 0 ? "0" : String(m.net)}</span>
            </div>
          )) : <p style={{ fontSize: 13, color: "rgba(26,26,26,0.35)", textAlign: "center" as const, padding: "20px 0" }}>No membership data</p>}
        </div>
      )}
    </div>
  );
}
