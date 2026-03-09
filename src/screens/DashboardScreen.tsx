import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import StatCard from "@/components/StatCard";
import DataCard from "@/components/DataCard";
import FlagIcon from "@/components/FlagIcon";
import CollapsibleSection from "@/components/CollapsibleSection";
import PillButton from "@/components/PillButton";
import { useChuteSideToast } from "@/components/ToastContext";

// ── Data ──────────────────────────────────────────────
const stats = [
  { label: "Total Head", value: "847", subtitle: "↑ 34 this quarter", angle: 140, route: "/animals" },
  { label: "Active Calving", value: "23", subtitle: "6 expected this week", angle: 155, route: "/calving" },
  { label: "Open Projects", value: "5", subtitle: "2 due before Friday", angle: 165, route: "/cow-work" },
];

const recentAnimals = [
  { title: "Tag 4782", values: ["Black Angus", "1,247 lbs", "Pen 2A"], flag: "teal" as const },
  { title: "Tag 3091", values: ["Hereford", "983 lbs", "Pen 4B"], flag: "gold" as const, subtitle: ["Treatment follow-up", "Thursday"] },
  { title: "Tag 5520", values: ["Charolais", "1,102 lbs", "Pen 1C"], flag: "red" as const, subtitle: ["Penicillin 10cc due", "Overdue 2 days"] },
  { title: "Tag 2218", values: ["Simmental", "1,340 lbs", "Pen 3A"], flag: "teal" as const },
  { title: "Tag 7801", values: ["Brahman Cross", "1,410 lbs", "Pen 1A"], flag: "gold" as const, subtitle: ["Calving expected", "Mar 8"] },
];

const upcomingWork = [
  { task: "Pregnancy check — Pen 3A", count: "18 head", due: "Tomorrow" },
  { task: "Vaccination booster — Pen 1C", count: "12 head", due: "Wed, Mar 4" },
  { task: "Weaning — North Pasture", count: "31 head", due: "Mar 10" },
];

const activityFeed = [
  { time: "2:14 PM", text: "Tag 4782 weighed at 1,247 lbs", flag: "teal" as const },
  { time: "1:45 PM", text: "Tag 5520 treatment administered — Penicillin 10cc", flag: "red" as const },
  { time: "11:20 AM", text: "Tag 3091 moved to Pen 4B for observation", flag: "gold" as const },
  { time: "9:05 AM", text: "Tag 2218 BCS scored at 6", flag: "teal" as const },
  { time: "8:30 AM", text: "Work session started — Pen 2A processing", flag: "teal" as const },
];

type ActionFlag = "red" | "gold";
const initialActionItems = [
  { id: "a1", title: "Tag 3309 feet need trimming", flag: "red" as ActionFlag, assignTo: "Me", linkedTo: "Animal", completed: false },
  { id: "a2", title: "Fence down section 3", flag: "gold" as ActionFlag, assignTo: "Mike T.", linkedTo: "North Pasture", completed: false },
  { id: "a3", title: "Order Draxxin restock", flag: "gold" as ActionFlag, assignTo: "Me", completed: false },
  { id: "a4", title: "Water tank float — East Section", flag: "gold" as ActionFlag, assignTo: "Mike T.", linkedTo: "East Meadow", completed: false },
  { id: "a5", title: "Move salt blocks to south pasture", flag: "gold" as ActionFlag, assignTo: "Emily O.", completed: false },
  { id: "a6", title: "Check on Tag 7801 — calving soon", flag: "gold" as ActionFlag, assignTo: "Me", linkedTo: "Animal", completed: false },
];

const herdStatus = {
  cull: { count: 8, color: "#9B2335", label: "Cull List", tier: "Critical / Urgent", flag: "red" as const },
  production: { count: 27, color: "#F3D12A", label: "Monitor", tier: "Watch / Follow-up", flag: "gold" as const },
  management: { count: 812, color: "#55BAAA", label: "Management", tier: "Routine / Active", flag: "teal" as const },
};

const herdSampleAnimals = [
  { group: "cull", tag: "5520", type: "Cow", memo: "Chronic limp, poor BCS" },
  { group: "production", tag: "3091", type: "Cow", memo: "Treatment follow-up Thu" },
  { group: "management", tag: "4782", type: "Cow", memo: "Normal" },
];

// ── Helpers ───────────────────────────────────────────
function SectionHeading({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-2 mb-2">
      <span style={{ fontSize: 13, fontWeight: 700, color: "#0E2646", letterSpacing: "0.01em" }}>{text}</span>
      <div className="flex-1 h-px" style={{ backgroundColor: "rgba(212,212,208,0.50)" }} />
    </div>
  );
}

// ── Component ─────────────────────────────────────────
const DashboardScreen: React.FC = () => {
  const [search, setSearch] = useState("");
  const [herdExpanded, setHerdExpanded] = useState(false);
  const [actionItems, setActionItems] = useState(initialActionItems);
  const { showToast } = useChuteSideToast();
  const navigate = useNavigate();

  const openActions = actionItems.filter((a) => !a.completed);
  const sortOrder: Record<string, number> = { red: 0, gold: 1 };
  const sortedActions = [...openActions].sort((a, b) => (sortOrder[a.flag] ?? 9) - (sortOrder[b.flag] ?? 9)).slice(0, 3);

  const filteredAnimals = search
    ? recentAnimals.filter((a) => a.title.toLowerCase().includes(search.toLowerCase()))
    : recentAnimals;

  return (
    <div className="space-y-5">
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
          onClick={() => navigate("/animals/new")}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") navigate("/animals/new"); }}
        >
          <span style={{ fontSize: 28, fontWeight: 300, color: "rgba(14,38,70,0.20)" }}>+</span>
          <span style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "rgba(14,38,70,0.30)" }}>NEW RECORD</span>
        </div>
      </div>

      {/* SECTION 3 — Herd Status */}
      <div>
        <div
          className="w-full rounded-xl px-4 py-3 flex items-center justify-between cursor-pointer transition-all active:scale-[0.98]"
          style={{ backgroundColor: "#0E2646" }}
          onClick={() => setHerdExpanded(!herdExpanded)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setHerdExpanded(!herdExpanded); }}
        >
          <div className="flex items-center gap-4">
            {[
              { flag: "teal" as const, count: herdStatus.management.count },
              { flag: "gold" as const, count: herdStatus.production.count },
              { flag: "red" as const, count: herdStatus.cull.count },
            ].map(({ flag, count }) => (
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
              const g = herdStatus[key];
              const sample = herdSampleAnimals.find((a) => a.group === key)!;
              return (
                <div key={key} className="space-y-2">
                  <div className="flex items-center gap-2.5 px-1">
                    <FlagIcon color={g.flag} size="sm" />
                    <span style={{ textTransform: "uppercase", fontSize: 11, fontWeight: 800, letterSpacing: "0.08em", color: g.color }}>{g.label}</span>
                    <span style={{ fontSize: 11, fontWeight: 600, color: g.color, opacity: 0.5 }}>({g.count})</span>
                    <div className="flex-1 h-px" style={{ backgroundColor: `${g.color}1F` }} />
                    <span style={{ fontSize: 9, fontWeight: 500, color: "rgba(26,26,26,0.30)" }}>{g.tier}</span>
                  </div>
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
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") navigate("/red-book"); }}
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
            {sortedActions.map((item, idx) => (
              <div
                key={item.id}
                className="flex items-center gap-3"
                style={{
                  padding: "10px 0",
                  borderBottom: idx < sortedActions.length - 1 ? "1px solid rgba(212,212,208,0.30)" : "none",
                }}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <FlagIcon color={item.flag} size="sm" />
                    <span className="truncate" style={{ fontSize: 13, fontWeight: 500, color: "#1A1A1A" }}>{item.title}</span>
                  </div>
                  <div style={{ fontSize: 11, fontWeight: 400, color: "rgba(26,26,26,0.35)", marginLeft: 22 }}>
                    {[item.assignTo, item.linkedTo].filter(Boolean).join(" · ")}
                  </div>
                </div>
                <button
                  className="shrink-0 rounded-full transition-colors hover:bg-accent/20 active:scale-[0.95]"
                  style={{ width: 22, height: 22, border: "2px solid #D4D4D0", backgroundColor: "transparent", cursor: "pointer" }}
                  aria-label={`Complete ${item.title}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setActionItems((prev) => prev.map((a) => a.id === item.id ? { ...a, completed: true } : a));
                    showToast("success", "Marked complete");
                  }}
                />
              </div>
            ))}
            <div
              className="mt-2 cursor-pointer"
              style={{ color: "#55BAAA", fontSize: 12, fontWeight: 600 }}
              onClick={(e) => { e.stopPropagation(); navigate("/red-book"); }}
            >
              View all {openActions.length} open actions →
            </div>
          </div>
        )}

        {/* Upcoming Work */}
        <div>
          <SectionHeading text="Upcoming Work" />
          <div className="rounded-xl bg-white overflow-hidden divide-y" style={{ border: "1px solid rgba(212,212,208,0.60)", borderColor: "rgba(212,212,208,0.60)" }}>
            {upcomingWork.map((w) => (
              <div
                key={w.task}
                className="px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-page-bg active:bg-border-divider/40 transition-colors"
                onClick={() => navigate("/cow-work")}
              >
                <div className="min-w-0 flex-1">
                  <div className="truncate" style={{ fontSize: 13, fontWeight: 600, color: "#1A1A1A" }}>{w.task}</div>
                  <div style={{ fontSize: 11, color: "rgba(26,26,26,0.40)" }}>{w.count}</div>
                </div>
                <span style={{ fontSize: 11, fontWeight: 600, color: "#55BAAA", flexShrink: 0 }}>{w.due}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* SECTION 5 — Activity + Recent Animals */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Today's Activity */}
        <CollapsibleSection title="Today's Activity" defaultOpen>
          <div className="space-y-3">
            {activityFeed.map((entry, i) => (
              <div key={i} className="flex items-start gap-3">
                <span className="shrink-0" style={{ width: 58, fontSize: 11, fontWeight: 500, color: "rgba(26,26,26,0.25)" }}>{entry.time}</span>
                <FlagIcon color={entry.flag} size="sm" />
                <span style={{ fontSize: 12, lineHeight: 1.5, color: "rgba(26,26,26,0.60)" }}>{entry.text}</span>
              </div>
            ))}
          </div>
        </CollapsibleSection>

        {/* Recent Animals */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <SectionHeading text="Recent Animals" />
            <span
              className="cursor-pointer"
              style={{ fontSize: 12, fontWeight: 600, color: "#55BAAA" }}
              onClick={() => navigate("/animals")}
            >
              View All
            </span>
          </div>
          <div className="space-y-2">
            {filteredAnimals.map((animal) => (
              <DataCard
                key={animal.title}
                title={animal.title}
                values={animal.values}
                subtitle={animal.subtitle}
                trailing={<FlagIcon color={animal.flag} size="sm" />}
              />
            ))}
          </div>
        </div>
      </div>

      {/* SECTION 6 — Quick Actions */}
      <div className="flex gap-3 pb-4">
        <PillButton size="lg" onClick={() => navigate("/animals/new")} style={{ flex: 1 }}>
          New Record
        </PillButton>
        <PillButton size="lg" variant="outline" onClick={() => navigate("/cow-work")} style={{ flex: 1 }}>
          Start Session
        </PillButton>
      </div>
    </div>
  );
};

export default DashboardScreen;
