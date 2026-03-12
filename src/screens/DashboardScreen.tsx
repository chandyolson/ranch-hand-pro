import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import StatCard from "@/components/StatCard";
import DataCard from "@/components/DataCard";
import FlagIcon from "@/components/FlagIcon";
import CollapsibleSection from "@/components/CollapsibleSection";
import { useChuteSideToast } from "@/components/ToastContext";
import { useAnimalCounts } from "@/hooks/useAnimals";
import { useCalvingCounts } from "@/hooks/useCalvingRecords";
import { useFlagCounts } from "@/hooks/useAnimalFlags";
import { useOperation } from "@/contexts/OperationContext";
import { supabase } from "@/integrations/supabase/client";

function SectionHeading({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-2 mb-2">
      <span style={{ fontSize: 13, fontWeight: 700, color: "#0E2646", letterSpacing: "0.01em" }}>{text}</span>
      <div className="flex-1 h-px" style={{ backgroundColor: "rgba(212,212,208,0.50)" }} />
    </div>
  );
}

const FLAG_CONFIG = {
  cull: { color: "#9B2335", label: "Cull List", tier: "Critical / Urgent", flag: "red" as const },
  production: { color: "#F3D12A", label: "Monitor", tier: "Watch / Follow-up", flag: "gold" as const },
  management: { color: "#55BAAA", label: "Management", tier: "Routine / Active", flag: "teal" as const },
};

const DashboardScreen: React.FC = () => {
  const [search, setSearch] = useState("");
  const [herdExpanded, setHerdExpanded] = useState(false);
  const { showToast } = useChuteSideToast();
  const navigate = useNavigate();
  const { operationId } = useOperation();

  // ── Stat card queries ──
  const { data: animalCounts } = useAnimalCounts();
  const { data: calvingCounts } = useCalvingCounts();
  const { data: flagCounts } = useFlagCounts();
  const { data: projectCounts } = useQuery({
    queryKey: ["project-counts", operationId],
    queryFn: async () => {
      const { count } = await supabase
        .from("projects")
        .select("*", { count: "exact", head: true })
        .eq("operation_id", operationId)
        .neq("project_status", "Completed");
      return count || 0;
    },
  });

  // ── Recent animals (last 5 updated) ──
  const { data: recentAnimals } = useQuery({
    queryKey: ["dashboard-recent-animals", operationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("animals")
        .select("id, tag, tag_color, breed, sex, type, year_born, status, memo")
        .eq("operation_id", operationId)
        .eq("status", "Active")
        .order("updated_at", { ascending: false })
        .limit(5);
      if (error) throw error;
      return data || [];
    },
  });

  // ── Upcoming work (next 3 pending/in-progress projects) ──
  const { data: upcomingWork } = useQuery({
    queryKey: ["dashboard-upcoming-work", operationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("id, name, date, project_status, head_count, group:groups(name)")
        .eq("operation_id", operationId)
        .in("project_status", ["Pending", "In Progress"])
        .order("date", { ascending: true })
        .limit(3);
      if (error) throw error;
      return data || [];
    },
  });

  // ── Action items (red book notes with has_action = true) ──
  const { data: actionItems } = useQuery({
    queryKey: ["dashboard-action-items", operationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("red_book_notes")
        .select("id, title, category, is_pinned, has_action, created_at")
        .eq("operation_id", operationId)
        .eq("has_action", true)
        .order("created_at", { ascending: false })
        .limit(5);
      if (error) throw error;
      return data || [];
    },
  });

  // ── Recent activity (last 5 calving records) ──
  const { data: recentActivity } = useQuery({
    queryKey: ["dashboard-recent-activity", operationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("calving_records")
        .select("id, calving_date, calf_status, calf_sex, dam:animals!calving_records_dam_id_fkey(tag)")
        .eq("operation_id", operationId)
        .order("created_at", { ascending: false })
        .limit(5);
      if (error) throw error;
      return data || [];
    },
  });

  // ── Herd status sample animals (one per flag tier) ──
  const { data: flagSamples } = useQuery({
    queryKey: ["dashboard-flag-samples", operationId],
    queryFn: async () => {
      const { data } = await supabase
        .from("animal_flags")
        .select("flag_tier, animal:animals(tag, type, memo)")
        .eq("operation_id", operationId)
        .in("flag_tier", ["cull", "production", "management"])
        .is("resolved_at", null)
        .limit(3);
      const results: Record<string, { tag: string; type: string; memo: string }> = {};
      (data || []).forEach((row: any) => {
        if (!results[row.flag_tier] && row.animal) {
          results[row.flag_tier] = { tag: row.animal.tag || "—", type: row.animal.type || "", memo: row.animal.memo || "" };
        }
      });
      return results;
    },
  });

  const stats = [
    { label: "Total Head", value: String(animalCounts?.total ?? "—"), subtitle: `${animalCounts?.active ?? 0} active`, angle: 140, route: "/animals" },
    { label: "Calving", value: String(calvingCounts?.total ?? "—"), subtitle: `${calvingCounts?.alive ?? 0} alive`, angle: 155, route: "/calving" },
    { label: "Open Projects", value: String(projectCounts ?? "—"), subtitle: "active projects", angle: 165, route: "/cow-work" },
  ];

  const fc = flagCounts || { management: 0, production: 0, cull: 0 };
  const openActions = actionItems || [];
  const animals = recentAnimals || [];
  const work = upcomingWork || [];
  const activity = recentActivity || [];

  const filteredAnimals = search
    ? animals.filter((a) => a.tag.toLowerCase().includes(search.toLowerCase()) || (a.breed || "").toLowerCase().includes(search.toLowerCase()))
    : animals;

  return (
    <div className="px-4 space-y-5">
      {/* SECTION 1 — Search */}
      <div className="relative">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" width="18" height="18" viewBox="0 0 18 18" fill="none">
          <circle cx="8" cy="8" r="5.5" stroke="rgba(26,26,26,0.16)" strokeWidth="1.5" />
          <path d="M12.5 12.5L16 16" stroke="rgba(26,26,26,0.16)" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        <input
          type="text"
          placeholder="Search tags, animals, projects, notes…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full h-[46px] rounded-xl bg-white border border-border-divider font-inter outline-none transition-all pl-10 pr-4 focus:border-gold focus:ring-2 focus:ring-gold/20"
          style={{ fontSize: 16, fontWeight: 400, color: "#1A1A1A" }}
        />
      </div>

      {/* SECTION 2 — Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {stats.map((s) => (
          <StatCard key={s.label} label={s.label} value={s.value} subtitle={s.subtitle} gradientAngle={s.angle} onClick={() => navigate(s.route)} />
        ))}
        <div
          className="rounded-2xl flex flex-col items-center justify-center gap-1 cursor-pointer transition-colors duration-150 active:scale-[0.98] hover:border-gold/40 hover:bg-gold/5"
          style={{ border: "2px dashed rgba(14,38,70,0.12)", minHeight: 72 }}
          onClick={() => navigate("/red-book/new")}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") navigate("/red-book/new"); }}
        >
          <span style={{ fontSize: 28, fontWeight: 300, color: "rgba(14,38,70,0.20)" }}>+</span>
          <span style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "rgba(14,38,70,0.30)" }}>NEW NOTE</span>
        </div>
      </div>

      {/* SECTION 3 — Herd Status */}
      <div>
        <div
          className="w-full rounded-xl px-4 py-3 flex items-center justify-between cursor-pointer transition-all active:scale-[0.98]"
          style={{ backgroundColor: "#0E2646" }}
          onClick={() => setHerdExpanded(!herdExpanded)}
        >
          <div className="flex items-center gap-4">
            {([
              { flag: "teal" as const, count: fc.management },
              { flag: "gold" as const, count: fc.production },
              { flag: "red" as const, count: fc.cull },
            ]).map(({ flag, count }) => (
              <div key={flag} className="flex items-center gap-1.5">
                <FlagIcon color={flag} size="sm" />
                <span style={{ color: "#FFFFFF", fontSize: 14, fontWeight: 700 }}>{count}</span>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <span style={{ color: "rgba(255,255,255,0.35)", fontSize: 11, fontWeight: 500 }}>Herd Status</span>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ transform: herdExpanded ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 200ms" }}>
              <path d="M3.5 5.25L7 8.75L10.5 5.25" stroke="rgba(255,255,255,0.35)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>

        {herdExpanded && (
          <div className="mt-3 space-y-4">
            {(["cull", "production", "management"] as const).map((key) => {
              const g = FLAG_CONFIG[key];
              const count = fc[key];
              const sample = flagSamples?.[key];
              if (count === 0) return null;
              return (
                <div key={key} className="space-y-2">
                  <div className="flex items-center gap-2.5 px-1">
                    <FlagIcon color={g.flag} size="sm" />
                    <span style={{ textTransform: "uppercase", fontSize: 11, fontWeight: 800, letterSpacing: "0.08em", color: g.color }}>{g.label}</span>
                    <span style={{ fontSize: 11, fontWeight: 600, color: g.color, opacity: 0.5 }}>({count})</span>
                    <div className="flex-1 h-px" style={{ backgroundColor: `${g.color}1F` }} />
                    <span style={{ fontSize: 9, fontWeight: 500, color: "rgba(26,26,26,0.30)" }}>{g.tier}</span>
                  </div>
                  {sample && (
                    <div
                      className="w-full rounded-xl px-3.5 py-2.5 flex items-center gap-3 cursor-pointer transition-all active:scale-[0.98]"
                      style={{ backgroundColor: "#0E2646" }}
                      onClick={() => navigate("/animals")}
                    >
                      <FlagIcon color={g.flag} size="sm" />
                      <span style={{ color: "#FFFFFF", fontSize: 14, fontWeight: 800 }}>{sample.tag}</span>
                      <span className="rounded-full" style={{ fontSize: 8, fontWeight: 700, color: "rgba(255,255,255,0.50)", backgroundColor: "rgba(255,255,255,0.08)", padding: "1.5px 7px", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                        {sample.type}
                      </span>
                      <span className="truncate" style={{ fontSize: 10, fontWeight: 500, color: "rgba(255,255,255,0.25)" }}>{sample.memo}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* SECTION 4 — Action Items + Upcoming Work */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Action Items */}
        {openActions.length > 0 && (
          <div
            className="rounded-xl bg-white p-4 cursor-pointer active:scale-[0.99] transition-transform"
            style={{ border: "1px solid #D4D4D0" }}
            onClick={() => navigate("/red-book")}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M3 1.5V14.5M3 1.5H12L9.5 5.25L12 9H3" stroke="#E74C3C" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                </svg>
                <span style={{ fontSize: 14, fontWeight: 700, color: "#0E2646" }}>Action Items</span>
              </div>
              <span className="rounded-full" style={{ padding: "2px 10px", fontSize: 11, fontWeight: 700, color: "#C62828", backgroundColor: "#FFEBEE" }}>
                {openActions.length}
              </span>
            </div>
            {openActions.slice(0, 3).map((item, idx) => (
              <div
                key={item.id}
                className="flex items-center gap-3"
                style={{ padding: "10px 0", borderBottom: idx < Math.min(openActions.length, 3) - 1 ? "1px solid rgba(212,212,208,0.30)" : "none" }}
              >
                <div className="flex-1 min-w-0">
                  <span className="truncate block" style={{ fontSize: 13, fontWeight: 500, color: "#1A1A1A" }}>{item.title}</span>
                  <span style={{ fontSize: 11, fontWeight: 400, color: "rgba(26,26,26,0.35)" }}>{item.category || ""}</span>
                </div>
              </div>
            ))}
            <div className="mt-2" style={{ color: "#55BAAA", fontSize: 12, fontWeight: 600 }}>
              View all {openActions.length} action items →
            </div>
          </div>
        )}

        {/* Upcoming Work */}
        <div>
          <SectionHeading text="Upcoming Work" />
          {work.length > 0 ? (
            <div className="rounded-xl bg-white overflow-hidden divide-y" style={{ border: "1px solid rgba(212,212,208,0.60)" }}>
              {work.map((w: any) => {
                const fmtDate = new Date(w.date).toLocaleDateString("en-US", { month: "short", day: "numeric" });
                return (
                  <div
                    key={w.id}
                    className="px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-page-bg active:bg-border-divider/40 transition-colors"
                    onClick={() => navigate(`/cow-work/${w.id}`)}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="truncate" style={{ fontSize: 13, fontWeight: 600, color: "#1A1A1A" }}>{w.name}</div>
                      <div style={{ fontSize: 11, color: "rgba(26,26,26,0.40)" }}>
                        {[w.group?.name, w.head_count ? `${w.head_count} head` : null].filter(Boolean).join(" · ")}
                      </div>
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 600, color: "#55BAAA", flexShrink: 0 }}>{fmtDate}</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-xl bg-white px-4 py-6 text-center" style={{ border: "1px solid rgba(212,212,208,0.60)" }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: "rgba(26,26,26,0.35)" }}>No upcoming projects</div>
            </div>
          )}
        </div>
      </div>

      {/* SECTION 5 — Activity + Recent Animals */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Recent Activity */}
        <CollapsibleSection title="Recent Activity" defaultOpen>
          {activity.length > 0 ? (
            <div className="space-y-3">
              {activity.map((entry: any) => {
                const dam = entry.dam as any;
                const dateStr = new Date(entry.calving_date).toLocaleDateString("en-US", { month: "short", day: "numeric" });
                const sexLabel = entry.calf_sex === "Bull" ? "bull" : entry.calf_sex === "Heifer" ? "heifer" : "calf";
                const text = entry.calf_status === "Dead"
                  ? `Dam ${dam?.tag || "?"} — ${sexLabel} calf born dead`
                  : `Dam ${dam?.tag || "?"} — ${sexLabel} calf born alive`;
                return (
                  <div key={entry.id} className="flex items-start gap-3">
                    <span className="shrink-0" style={{ width: 58, fontSize: 11, fontWeight: 500, color: "rgba(26,26,26,0.25)" }}>{dateStr}</span>
                    <FlagIcon color={entry.calf_status === "Dead" ? "red" : "teal"} size="sm" />
                    <span style={{ fontSize: 12, lineHeight: 1.5, color: "rgba(26,26,26,0.60)" }}>{text}</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ fontSize: 12, color: "rgba(26,26,26,0.35)", padding: "8px 0" }}>No recent calving activity</div>
          )}
        </CollapsibleSection>

        {/* Recent Animals */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <SectionHeading text="Recent Animals" />
            <span className="cursor-pointer" style={{ fontSize: 12, fontWeight: 600, color: "#55BAAA" }} onClick={() => navigate("/animals")}>
              View All
            </span>
          </div>
          <div className="space-y-2">
            {filteredAnimals.map((animal) => (
              <div
                key={animal.id}
                className="cursor-pointer active:scale-[0.99] transition-transform duration-100"
                onClick={() => navigate(`/animals/${animal.id}`)}
              >
                <DataCard
                  title={`Tag ${animal.tag}`}
                  values={[animal.breed || "Unknown", animal.type || "", animal.year_born ? String(animal.year_born) : ""].filter(Boolean)}
                  subtitle={animal.memo ? [animal.memo] : undefined}
                />
              </div>
            ))}
            {filteredAnimals.length === 0 && (
              <div style={{ fontSize: 12, color: "rgba(26,26,26,0.35)", padding: "8px 0", textAlign: "center" }}>No animals found</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardScreen;
