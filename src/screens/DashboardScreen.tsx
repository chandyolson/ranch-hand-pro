import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from "recharts";
import StatCard from "@/components/StatCard";
import FlagIcon from "@/components/FlagIcon";
import CollapsibleSection from "@/components/CollapsibleSection";
import { useChuteSideToast } from "@/components/ToastContext";
import { useAnimalCounts } from "@/hooks/useAnimals";
import { useCalvingCounts } from "@/hooks/useCalvingRecords";
import { useFlagCounts } from "@/hooks/useAnimalFlags";
import { useOperation } from "@/contexts/OperationContext";
import { supabase } from "@/integrations/supabase/client";
import VetDashboardScreen from "@/screens/VetDashboardScreen";
import DataGapNudges from "@/components/dashboard/DataGapNudges";

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
  const { operationType } = useOperation();

  // Vet practices get a completely different dashboard
  if (operationType === "vet_practice") {
    return <VetDashboardScreen />;
  }

  return <RanchDashboardScreen />;
};

const RanchDashboardScreen: React.FC = () => {
  const [search, setSearch] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [herdExpanded, setHerdExpanded] = useState(false);
  const { showToast } = useChuteSideToast();
  const navigate = useNavigate();
  const { operationId } = useOperation();

  // Debounce search input (300ms)
  React.useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  // ── Search results query ──
  const { data: searchResults } = useQuery({
    queryKey: ["dashboard-search", debouncedSearch, operationId],
    enabled: !!operationId && debouncedSearch.length >= 2,
    queryFn: async () => {
      const q = debouncedSearch;

      const [animalsRes, projectsRes] = await Promise.all([
        supabase
          .from("animals")
          .select("id, tag, tag_color, type, breed, status")
          .eq("operation_id", operationId)
          .ilike("tag", `%${q}%`)
          .order("tag")
          .limit(10),
        supabase
          .from("projects")
          .select("id, name, status, work_type")
          .eq("operation_id", operationId)
          .ilike("name", `%${q}%`)
          .order("created_at", { ascending: false })
          .limit(5),
      ]);

      return {
        animals: animalsRes.data || [],
        projects: projectsRes.data || [],
      };
    },
  });

  const showDropdown = searchFocused && debouncedSearch.length >= 2 &&
    ((searchResults?.animals?.length ?? 0) > 0 || (searchResults?.projects?.length ?? 0) > 0);

  // ── Stat card queries ──
  const { data: animalCounts } = useAnimalCounts();
  const { data: calvingCounts } = useCalvingCounts();
  const { data: flagCounts } = useFlagCounts();
  const { data: projectCounts } = useQuery({
    queryKey: ["project-counts", operationId],
    enabled: !!operationId,
    queryFn: async () => {
      const { count, error } = await supabase
        .from("projects")
        .select("*", { count: "exact", head: true })
        .eq("operation_id", operationId)
        .neq("project_status", "Completed");
      if (error) throw error;
      return count ?? 0;
    },
  });

  // ── Calving-per-day chart data (last 30 days) ──
  const { data: calvingByDay } = useQuery({
    queryKey: ["dashboard-calving-by-day", operationId],
    enabled: !!operationId,
    queryFn: async () => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const { data, error } = await supabase
        .from("calving_records")
        .select("calving_date, calf_status")
        .eq("operation_id", operationId)
        .gte("calving_date", thirtyDaysAgo.toISOString().split("T")[0])
        .order("calving_date", { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });

  // ── Upcoming work (next 3 pending/in-progress projects) ──
  const { data: upcomingWork } = useQuery({
    queryKey: ["dashboard-upcoming-work", operationId],
    enabled: !!operationId,
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
    enabled: !!operationId,
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
    enabled: !!operationId,
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
    enabled: !!operationId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("animal_flags")
        .select("flag_tier, animal_id, animal:animals(id, tag, type, memo)")
        .eq("operation_id", operationId)
        .in("flag_tier", ["cull", "production", "management"])
        .is("resolved_at", null)
        .limit(3);
      if (error) throw error;
      const results: Record<string, { id: string; tag: string; type: string; memo: string }> = {};
      (data || []).forEach((row: any) => {
        if (!results[row.flag_tier] && row.animal) {
          results[row.flag_tier] = { id: row.animal.id || row.animal_id, tag: row.animal.tag || "—", type: row.animal.type || "", memo: row.animal.memo || "" };
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
  const work = upcomingWork || [];
  const activity = recentActivity || [];

  // Build chart data from calving records
  const chartData = useMemo(() => {
    const raw = calvingByDay || [];
    const counts: Record<string, { date: string; alive: number; dead: number }> = {};
    raw.forEach((r) => {
      if (!counts[r.calving_date]) counts[r.calving_date] = { date: r.calving_date, alive: 0, dead: 0 };
      if (r.calf_status === "Dead") counts[r.calving_date].dead++;
      else counts[r.calving_date].alive++;
    });
    return Object.values(counts)
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((d) => ({
        ...d,
        label: new Date(d.date + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      }));
  }, [calvingByDay]);

  return (
    <div className="px-4 space-y-5">
      {/* SECTION 1 — Search */}
      <div className="relative">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" width="18" height="18" viewBox="0 0 18 18" fill="none" style={{ zIndex: 1 }}>
          <circle cx="8" cy="8" r="5.5" stroke="rgba(26,26,26,0.16)" strokeWidth="1.5" />
          <path d="M12.5 12.5L16 16" stroke="rgba(26,26,26,0.16)" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        <input
          type="text"
          placeholder="Search tags, animals, projects…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onFocus={() => setSearchFocused(true)}
          onBlur={() => setTimeout(() => setSearchFocused(false), 200)}
          className="w-full h-[46px] rounded-xl bg-white border border-border-divider font-inter outline-none transition-all pl-10 pr-4 focus:border-gold focus:ring-2 focus:ring-gold/20"
          style={{ fontSize: 16, fontWeight: 400, color: "#1A1A1A" }}
        />

        {/* Search results dropdown */}
        {showDropdown && (
          <div
            style={{
              position: "absolute",
              top: "100%",
              left: 0,
              right: 0,
              marginTop: 4,
              backgroundColor: "white",
              borderRadius: 12,
              border: "1px solid #D4D4D0",
              boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
              zIndex: 50,
              maxHeight: 320,
              overflowY: "auto",
            }}
          >
            {/* Animal results */}
            {(searchResults?.animals?.length ?? 0) > 0 && (
              <>
                <div style={{ padding: "8px 12px 4px", fontSize: 10, fontWeight: 700, color: "rgba(26,26,26,0.35)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Animals</div>
                {searchResults!.animals.map((a: any) => (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => { navigate(`/animals/${a.id}`); setSearch(""); }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      width: "100%",
                      padding: "8px 12px",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      textAlign: "left",
                    }}
                  >
                    {a.tag_color && a.tag_color !== "None" && (
                      <span style={{
                        width: 8, height: 8, borderRadius: "50%", flexShrink: 0,
                        backgroundColor: a.tag_color === "Red" ? "#DC2626" : a.tag_color === "Yellow" ? "#EAB308" : a.tag_color === "Green" ? "#16A34A" : a.tag_color === "Blue" ? "#2563EB" : a.tag_color === "Orange" ? "#EA580C" : a.tag_color === "White" ? "#E5E5E5" : a.tag_color === "Purple" ? "#7C3AED" : "#999",
                      }} />
                    )}
                    <span style={{ fontSize: 14, fontWeight: 700, color: "#0E2646" }}>{a.tag}</span>
                    <span style={{ fontSize: 11, color: "rgba(26,26,26,0.45)" }}>{[a.type, a.breed, a.status !== "Active" ? a.status : null].filter(Boolean).join(" · ")}</span>
                  </button>
                ))}
              </>
            )}

            {/* Project results */}
            {(searchResults?.projects?.length ?? 0) > 0 && (
              <>
                <div style={{ padding: "8px 12px 4px", fontSize: 10, fontWeight: 700, color: "rgba(26,26,26,0.35)", textTransform: "uppercase", letterSpacing: "0.06em", borderTop: (searchResults?.animals?.length ?? 0) > 0 ? "1px solid #E5E5E0" : "none" }}>Projects</div>
                {searchResults!.projects.map((p: any) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => { navigate(`/cow-work/${p.id}`); setSearch(""); }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      width: "100%",
                      padding: "8px 12px",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      textAlign: "left",
                    }}
                  >
                    <span style={{ fontSize: 14, fontWeight: 600, color: "#0E2646" }}>{p.name}</span>
                    <span style={{ fontSize: 11, color: "rgba(26,26,26,0.45)" }}>{[p.work_type, p.status].filter(Boolean).join(" · ")}</span>
                  </button>
                ))}
              </>
            )}
          </div>
        )}
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

      {/* Data Gap Nudges */}
      <DataGapNudges />

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
                      onClick={() => sample.id ? navigate("/animals/" + sample.id) : navigate("/animals")}
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

      {/* SECTION 5 — Activity + Calving Chart */}
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

        {/* Calving Chart */}
        <div>
          <SectionHeading text="Calves per Day (Last 30 Days)" />
          {chartData.length > 0 ? (
            <div className="rounded-xl bg-white p-3" style={{ border: "1px solid rgba(212,212,208,0.60)" }}>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={chartData} barCategoryGap="20%">
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(212,212,208,0.40)" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: "rgba(26,26,26,0.40)" }} tickLine={false} axisLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: "rgba(26,26,26,0.40)" }} tickLine={false} axisLine={false} width={24} />
                  <Tooltip
                    contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid rgba(212,212,208,0.60)" }}
                    labelStyle={{ fontWeight: 600 }}
                  />
                  <Bar dataKey="alive" stackId="a" fill="#55BAAA" radius={[0, 0, 0, 0]} name="Alive" />
                  <Bar dataKey="dead" stackId="a" fill="#9B2335" radius={[4, 4, 0, 0]} name="Dead" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="rounded-xl bg-white px-4 py-6 text-center" style={{ border: "1px solid rgba(212,212,208,0.60)" }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: "rgba(26,26,26,0.35)" }}>No calving data in the last 30 days</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DashboardScreen;
