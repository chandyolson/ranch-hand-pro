/**
 * AnimalsDashboardScreen — replaces AnimalsScreen as the /animals landing page.
 * Three tabs: Dashboard (herd overview), Herd Analysis (age/breed/type breakdowns), Records (existing AnimalsScreen).
 *
 * All data from animals + animal_flags via Supabase. No mock data.
 * Renders inside AppLayout (header provided by parent).
 */
import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOperation } from "@/contexts/OperationContext";
import AnimalsScreen from "@/screens/AnimalsScreen";
import {
  XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar, CartesianGrid,
} from "recharts";

/* ═══════════════ ROYAL PALETTE ═══════════════ */
const C = {
  navy: "#0E2646", navyMid: "#153566", cream: "#F5F5F0",
  yellow: "#F3D12A", white: "#FFFFFF", border: "#D4D4D0",
  text: "#1A1A1A", teal: "#55BAAA", tealLight: "#A8E6DA",
  royalBlue: "#3266AD", deepPurple: "#3B2072", crimson: "#7B2D3B",
  burgundy: "#8B3A4A", antiqueGold: "#C4A24E", lavender: "#9590A8",
};

const pillStyles: Record<string, { bg: string; color: string }> = {
  cull:       { bg: "rgba(123,45,59,0.12)", color: "#7B2D3B" },
  production: { bg: "rgba(196,162,78,0.12)", color: "#8B6914" },
  management: { bg: "rgba(85,186,170,0.12)", color: "#2A7A6C" },
};

const typeColors: Record<string, string> = {
  Cow: C.royalBlue, Replacement: C.antiqueGold, Bull: C.deepPurple,
  Calf: C.teal, Feeder: C.burgundy,
};

/* ═══════════════ PRIMITIVES ═══════════════ */
const WCard = ({ children, style = {} }: { children: React.ReactNode; style?: React.CSSProperties }) => (
  <div className="rounded-xl bg-white border border-[#D4D4D0]/60" style={{ padding: 14, ...style }}>{children}</div>
);
const Lbl = ({ children }: { children: React.ReactNode }) => (
  <p className="uppercase" style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.08em", color: "rgba(26,26,26,0.4)", lineHeight: 1.3 }}>{children}</p>
);
const Big = ({ value, color = C.navy, size = 28 }: { value: string; color?: string; size?: number }) => (
  <p style={{ fontSize: size, fontWeight: 800, color, lineHeight: 1, letterSpacing: "-0.02em" }}>{value}</p>
);
const Sub = ({ children, color = "rgba(26,26,26,0.45)" }: { children: React.ReactNode; color?: string }) => (
  <p style={{ fontSize: 11, fontWeight: 500, color, lineHeight: 1.3 }}>{children}</p>
);
const Tip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg px-3 py-2 shadow-lg" style={{ backgroundColor: C.navy }}>
      <p style={{ fontSize: 10, fontWeight: 600, color: "rgba(255,255,255,0.5)" }}>{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ fontSize: 12, fontWeight: 700, color: p.color || "#fff" }}>{p.name}: {p.value}</p>
      ))}
    </div>
  );
};
const Legend = ({ data }: { data: { name: string; value: number; color: string }[] }) => (
  <div className="flex flex-wrap gap-x-4 gap-y-1.5 justify-center mt-2">
    {data.map((d) => (
      <div key={d.name} className="flex items-center gap-1.5">
        <div className="rounded-sm" style={{ width: 8, height: 8, backgroundColor: d.color }} />
        <span style={{ fontSize: 10, fontWeight: 600, color: "rgba(26,26,26,0.55)" }}>{d.name}</span>
        <span style={{ fontSize: 10, fontWeight: 700, color: C.text }}>{d.value}</span>
      </div>
    ))}
  </div>
);
const Divider = ({ title }: { title: string }) => (
  <div className="flex items-center gap-3 pt-1">
    <span style={{ fontSize: 13, fontWeight: 700, color: C.navy, whiteSpace: "nowrap" }}>{title}</span>
    <div className="flex-1 h-px" style={{ backgroundColor: "rgba(212,212,208,0.5)" }} />
  </div>
);
const Chevron = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M6 4L10 8L6 12" stroke={C.border} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
);
const Skeleton = () => (
  <WCard><div className="animate-pulse flex flex-col gap-2"><div className="h-3 bg-gray-200 rounded w-1/3" /><div className="h-6 bg-gray-200 rounded w-1/2" /><div className="h-3 bg-gray-200 rounded w-2/3" /></div></WCard>
);

/* ═══════════════ DATA HOOKS ═══════════════ */

function useHerdData(operationId: string) {
  return useQuery({
    queryKey: ["animals-dash-herd", operationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("animals")
        .select("id, type, sex, status, year_born, breed, tag, tag_color, name, reg_name, sire_id")
        .eq("operation_id", operationId)
        .eq("status", "Active");
      if (error) throw error;
      return data || [];
    },
    enabled: !!operationId,
  });
}

function useAllFlags(operationId: string) {
  return useQuery({
    queryKey: ["animals-dash-flags", operationId],
    queryFn: async () => {
      const { data: flags, error } = await supabase
        .from("animal_flags")
        .select("animal_id, flag_tier, flag_name")
        .eq("operation_id", operationId)
        .is("resolved_at", null);
      if (error) throw error;
      if (!flags?.length) return { flagged: [], summary: [] };

      const ids = [...new Set(flags.map((f) => f.animal_id))];
      const { data: animals } = await supabase
        .from("animals")
        .select("id, tag, type, sex")
        .in("id", ids);
      const infoMap: Record<string, { tag: string; type: string; sex: string }> = {};
      (animals || []).forEach((a) => { infoMap[a.id] = { tag: a.tag, type: a.type, sex: a.sex }; });

      // Group flags by animal
      const grouped: Record<string, { tag: string; id: string; type: string; pills: { text: string; tier: string }[] }> = {};
      flags.forEach((f) => {
        const info = infoMap[f.animal_id];
        if (!info) return;
        if (!grouped[f.animal_id]) grouped[f.animal_id] = { tag: info.tag, id: f.animal_id, type: info.type, pills: [] };
        grouped[f.animal_id].pills.push({ text: f.flag_name, tier: f.flag_tier });
      });

      // Summary by flag name
      const summary: Record<string, number> = {};
      flags.forEach((f) => { summary[f.flag_name] = (summary[f.flag_name] || 0) + 1; });
      const summaryArr = Object.entries(summary).sort(([, a], [, b]) => b - a).map(([name, count]) => ({ name, count }));

      return { flagged: Object.values(grouped), summary: summaryArr };
    },
    enabled: !!operationId,
  });
}

/* ═══════════════ COMPUTE METRICS ═══════════════ */
function useHerdMetrics(raw: any[] | undefined) {
  return useMemo(() => {
    if (!raw?.length) return null;
    const currentYear = new Date().getFullYear();
    const total = raw.length;
    const cows = raw.filter((a) => a.type === "Cow" && a.sex === "Cow");
    const replacements = raw.filter((a) => a.type === "Replacement");
    const bulls = raw.filter((a) => a.type === "Bull");
    const calves = raw.filter((a) => a.type === "Calf");
    const feeders = raw.filter((a) => a.type === "Feeder");

    // Cow ages
    const cowsWithAge = cows.filter((a) => a.year_born != null);
    const cowAges = cowsWithAge.map((a) => currentYear - a.year_born);
    const avgCowAge = cowAges.length ? (cowAges.reduce((a, b) => a + b, 0) / cowAges.length).toFixed(1) : null;
    const oldestCow = cowAges.length ? Math.max(...cowAges) : null;
    const youngestCow = cowAges.length ? Math.min(...cowAges) : null;

    // Cow age distribution
    const ageBuckets = [
      { r: "2 yr", lo: 1, hi: 2 }, { r: "3 yr", lo: 3, hi: 3 }, { r: "4 yr", lo: 4, hi: 4 },
      { r: "5-6 yr", lo: 5, hi: 6 }, { r: "7-8 yr", lo: 7, hi: 8 }, { r: "9-10 yr", lo: 9, hi: 10 },
      { r: "11+ yr", lo: 11, hi: 99 },
    ];
    const cowAgeDist = ageBuckets.map((b) => ({
      range: b.r, count: cowAges.filter((a) => a >= b.lo && a <= b.hi).length,
    }));

    // Type breakdown
    const typeBreakdown = [
      { name: "Cow", value: cows.length, color: typeColors.Cow },
      { name: "Replacement", value: replacements.length, color: typeColors.Replacement },
      { name: "Bull", value: bulls.length, color: typeColors.Bull },
      { name: "Calf", value: calves.length, color: typeColors.Calf },
      { name: "Feeder", value: feeders.length, color: typeColors.Feeder },
    ].filter((t) => t.value > 0);

    // Breed breakdown (active animals)
    const breedMap: Record<string, number> = {};
    raw.forEach((a) => { const b = a.breed || "Unknown"; breedMap[b] = (breedMap[b] || 0) + 1; });
    const breedBreakdown = Object.entries(breedMap).sort(([, a], [, b]) => b - a)
      .map(([name, count]) => ({ name, count }));

    // Bull roster
    const bullRoster = bulls.map((b) => ({
      id: b.id, tag: b.tag, tagColor: b.tag_color, breed: b.breed,
      age: b.year_born ? currentYear - b.year_born : null,
      name: b.name || b.reg_name || null,
    })).sort((a, b) => a.tag.localeCompare(b.tag, undefined, { numeric: true }));

    // Calf breakdown by sex
    const bullCalves = calves.filter((a) => a.sex === "Bull").length;
    const heiferCalves = calves.filter((a) => a.sex === "Cow").length;

    // Sire data availability
    const hasSireData = raw.some((a) => a.sire_id != null);

    // Sire breakdown (if data exists)
    let sireBreakdown: { sireId: string; tag: string; name: string | null; count: number }[] = [];
    if (hasSireData) {
      const sireMap: Record<string, { count: number }> = {};
      raw.filter((a) => a.sire_id).forEach((a) => {
        sireMap[a.sire_id] = sireMap[a.sire_id] || { count: 0 };
        sireMap[a.sire_id].count++;
      });
      // Would need a second query to get sire tags — handled in the hook if needed
    }

    return {
      total, cows: cows.length, replacements: replacements.length,
      bulls: bulls.length, calves: calves.length, feeders: feeders.length,
      avgCowAge, oldestCow, youngestCow, cowAgeDist,
      typeBreakdown, breedBreakdown, bullRoster,
      bullCalves, heiferCalves, hasSireData,
    };
  }, [raw]);
}

/* ═══════════════ MAIN SCREEN ═══════════════ */
export default function AnimalsDashboardScreen() {
  const [tab, setTab] = useState("Dashboard");
  const [search, setSearch] = useState("");
  const { operationId } = useOperation();
  const nav = useNavigate();

  const { data: raw, isLoading } = useHerdData(operationId);
  const { data: flagData } = useAllFlags(operationId);
  const m = useHerdMetrics(raw);

  // Search
  const { data: searchResults } = useQuery({
    queryKey: ["animals-dash-search", operationId, search],
    queryFn: async () => {
      if (!search || search.length < 2) return [];
      const { data, error } = await supabase
        .from("animals")
        .select("id, tag, tag_color, type, sex, breed, status")
        .eq("operation_id", operationId)
        .eq("status", "Active")
        .limit(2000);
      if (error) throw error;
      const q = search.toLowerCase();
      return (data || []).filter((a) =>
        a.tag.toLowerCase().includes(q) ||
        (a.breed || "").toLowerCase().includes(q) ||
        (a.type || "").toLowerCase().includes(q)
      ).slice(0, 20);
    },
    enabled: !!operationId && search.length >= 2,
  });

  // Breed chart colors
  const breedColors = [C.royalBlue, C.antiqueGold, C.deepPurple, C.teal, C.burgundy, C.lavender, C.crimson];

  return (
    <div className="px-4">
      {/* Tab bar */}
      <div className="flex -mx-4 bg-white" style={{ borderBottom: "1px solid #D4D4D0", paddingLeft: 16, marginTop: -20 }}>
        {["Dashboard", "Herd Analysis", "Records"].map((t) => (
          <button key={t} onClick={() => setTab(t)} className="cursor-pointer"
            style={{ padding: "10px 12px", fontSize: 13, fontWeight: 600, background: "none", border: "none",
              color: tab === t ? C.navy : "rgba(26,26,26,0.4)",
              borderBottom: tab === t ? `2.5px solid ${C.yellow}` : "2.5px solid transparent",
            }}>{t}</button>
        ))}
      </div>

      {/* Search bar */}
      <div className="relative mt-3 mb-2">
        <div className="absolute" style={{ left: 14, top: 22, transform: "translateY(-50%)", pointerEvents: "none" }}>
          <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="rgba(26,26,26,0.3)" strokeWidth="2" strokeLinecap="round"><circle cx="8.5" cy="8.5" r="6" /><path d="M13 13l4.5 4.5" /></svg>
        </div>
        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by tag, breed, or type…" className="w-full outline-none"
          style={{ height: 44, borderRadius: 22, border: "1px solid #D4D4D0", background: "#FFF", padding: "0 16px 0 42px", fontSize: 14, fontFamily: "Inter, sans-serif", color: C.text }}
          onFocus={(e) => { e.currentTarget.style.borderColor = C.yellow; e.currentTarget.style.boxShadow = "0 0 0 2px rgba(243,209,42,0.25)"; }}
          onBlur={(e) => { setTimeout(() => { e.currentTarget.style.borderColor = "#D4D4D0"; e.currentTarget.style.boxShadow = "none"; }, 150); }}
        />
        {search.length >= 2 && searchResults && searchResults.length > 0 && (
          <div className="absolute left-0 right-0 bg-white border border-[#D4D4D0] rounded-xl mt-1 shadow-lg overflow-hidden" style={{ zIndex: 20, maxHeight: 260, overflowY: "auto" }}>
            {searchResults.map((a: any) => (
              <button key={a.id} onClick={() => { nav(`/animals/${a.id}`); setSearch(""); }}
                className="w-full flex items-center justify-between px-4 py-2.5 cursor-pointer hover:bg-gray-50"
                style={{ background: "none", border: "none", borderBottom: "1px solid rgba(212,212,208,0.2)" }}>
                <div className="flex items-center gap-3">
                  <span style={{ fontSize: 13, fontWeight: 600, color: C.navy }}>{a.tag}</span>
                  <span className="uppercase rounded-full px-2 py-0.5" style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.04em", backgroundColor: `${typeColors[a.type] || C.lavender}18`, color: typeColors[a.type] || C.lavender }}>{a.type}</span>
                </div>
                <span style={{ fontSize: 10, color: "rgba(26,26,26,0.35)" }}>{a.breed || "—"}</span>
              </button>
            ))}
          </div>
        )}
        {search.length >= 2 && searchResults && searchResults.length === 0 && (
          <div className="absolute left-0 right-0 bg-white border border-[#D4D4D0] rounded-xl mt-1 shadow-lg px-4 py-3" style={{ zIndex: 20 }}>
            <p style={{ fontSize: 12, color: "rgba(26,26,26,0.4)" }}>No animals match "{search}"</p>
          </div>
        )}
      </div>

      {/* ═══════ DASHBOARD TAB ═══════ */}
      {tab === "Dashboard" && (
        <>
          {isLoading || !m ? (
            <div className="flex flex-col gap-3"><Skeleton /><Skeleton /><Skeleton /></div>
          ) : (
            <div className="flex flex-col gap-3 pb-10">

              {/* Herd Banner */}
              <div className="rounded-xl overflow-hidden" style={{ background: `linear-gradient(145deg, ${C.navy} 0%, ${C.navyMid} 55%, ${C.teal} 100%)` }}>
                <div className="px-4 pt-4 pb-3">
                  <div className="flex items-end justify-between">
                    <div>
                      <p className="uppercase" style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.08em", color: "rgba(255,255,255,0.3)" }}>Active Herd</p>
                      <p style={{ fontSize: 42, fontWeight: 800, color: "#fff", lineHeight: 1, letterSpacing: "-0.03em", marginTop: 4 }}>{m.total}</p>
                      <p style={{ fontSize: 12, fontWeight: 500, color: C.tealLight, marginTop: 4 }}>total active head</p>
                    </div>
                    {m.avgCowAge && (
                      <div className="text-right">
                        <p style={{ fontSize: 36, fontWeight: 800, color: C.yellow, lineHeight: 1 }}>{m.avgCowAge}</p>
                        <p style={{ fontSize: 10, fontWeight: 500, color: "rgba(255,255,255,0.4)", marginTop: 2 }}>avg cow age</p>
                      </div>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-5" style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}>
                  {[
                    { l: "Cows", v: String(m.cows), c: "#fff" },
                    { l: "Replc", v: String(m.replacements), c: "#fff" },
                    { l: "Bulls", v: String(m.bulls), c: "#fff" },
                    { l: "Calves", v: String(m.calves), c: C.tealLight },
                    { l: "Feeders", v: String(m.feeders), c: "#fff" },
                  ].map((s, i) => (
                    <div key={s.l} className="text-center py-2.5" style={{ borderRight: i < 4 ? "1px solid rgba(255,255,255,0.06)" : "none" }}>
                      <p style={{ fontSize: 16, fontWeight: 800, color: s.c, lineHeight: 1.1 }}>{s.v}</p>
                      <p className="uppercase" style={{ fontSize: 8, fontWeight: 600, letterSpacing: "0.06em", color: "rgba(255,255,255,0.25)" }}>{s.l}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Animal Type Breakdown */}
              <Divider title="Herd Composition" />
              <WCard>
                <Lbl>Active Animals by Type</Lbl>
                <div className="flex items-center gap-2 mt-2">
                  <div style={{ width: 130, height: 130, flexShrink: 0 }}>
                    <ResponsiveContainer>
                      <PieChart><Pie data={m.typeBreakdown} cx="50%" cy="50%" innerRadius={28} outerRadius={52} dataKey="value" paddingAngle={2} strokeWidth={0}>
                        {m.typeBreakdown.map((e, i) => <Cell key={i} fill={e.color} />)}
                      </Pie><Tooltip content={<Tip />} /></PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex-1 flex flex-col gap-1.5">
                    {m.typeBreakdown.map((d) => (
                      <button key={d.name} onClick={() => { setTab("Records"); }}
                        className="flex items-center justify-between cursor-pointer" style={{ background: "none", border: "none", padding: 0 }}>
                        <div className="flex items-center gap-1.5">
                          <div className="rounded-sm" style={{ width: 7, height: 7, backgroundColor: d.color }} />
                          <span style={{ fontSize: 11, fontWeight: 500, color: "rgba(26,26,26,0.6)" }}>{d.name}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span style={{ fontSize: 12, fontWeight: 700, color: C.text }}>{d.value}</span>
                          <span style={{ fontSize: 9, fontWeight: 500, color: "rgba(26,26,26,0.3)" }}>({m.total > 0 ? Math.round(d.value / m.total * 100) : 0}%)</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </WCard>

              {/* Cow Age Distribution */}
              <Divider title="Cow Herd Age" />
              <WCard>
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <Lbl>Avg Cow Age</Lbl>
                    <div className="flex items-baseline gap-1.5 mt-1">
                      <Big value={m.avgCowAge || "—"} />
                      <span style={{ fontSize: 14, fontWeight: 600, color: "rgba(26,26,26,0.35)" }}>years</span>
                    </div>
                    <Sub>{m.cows} active cows{m.oldestCow ? ` · oldest ${m.oldestCow} yr` : ""}</Sub>
                  </div>
                  <div className="text-right">
                    <Lbl>Calf Crop</Lbl>
                    <div className="flex items-baseline gap-1.5 mt-1 justify-end">
                      <Big value={String(m.calves)} size={22} />
                    </div>
                    <Sub>{m.bullCalves} bulls · {m.heiferCalves} heifers</Sub>
                  </div>
                </div>
                <div style={{ width: "100%", height: 160 }} className="mt-2">
                  <ResponsiveContainer>
                    <BarChart data={m.cowAgeDist} margin={{ top: 4, right: 4, left: -22, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(14,38,70,0.06)" />
                      <XAxis dataKey="range" tick={{ fontSize: 9, fill: "rgba(26,26,26,0.35)" }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 8, fill: "rgba(26,26,26,0.35)" }} axisLine={false} tickLine={false} />
                      <Tooltip content={<Tip />} />
                      <Bar dataKey="count" radius={[4, 4, 0, 0]} name="Cows" fill={C.royalBlue} fillOpacity={0.85} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </WCard>

              {/* Active Flags Summary */}
              {flagData && flagData.summary.length > 0 && <>
                <Divider title="Active Flags" />
                <WCard>
                  <div className="flex items-center justify-between mb-2">
                    <Lbl>Flag Summary</Lbl>
                    <span style={{ fontSize: 12, fontWeight: 700, color: C.crimson }}>{flagData.flagged.length} animals flagged</span>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {flagData.summary.map((f) => (
                      <span key={f.name} className="rounded-full px-3 py-1.5" style={{ fontSize: 11, fontWeight: 600, backgroundColor: "rgba(14,38,70,0.04)", color: C.navy }}>
                        {f.name} <span style={{ fontWeight: 700, color: C.crimson }}>{f.count}</span>
                      </span>
                    ))}
                  </div>
                </WCard>
              </>}

              {/* Flagged Animals List */}
              {flagData && flagData.flagged.length > 0 && <>
                <Divider title="Flagged Animals" />
                <WCard>
                  {flagData.flagged.map((cow, i) => (
                    <div key={cow.id}>
                      <button onClick={() => nav(`/animals/${cow.id}`)}
                        className="w-full flex items-center justify-between py-2.5 cursor-pointer"
                        style={{ background: "none", border: "none" }}>
                        <div className="flex items-center gap-2" style={{ minWidth: 0 }}>
                          <span style={{ fontSize: 14, fontWeight: 600, color: C.text, minWidth: 50 }}>{cow.tag}</span>
                          <span className="uppercase rounded-full px-1.5 py-0.5" style={{ fontSize: 8, fontWeight: 700, letterSpacing: "0.04em", backgroundColor: `${typeColors[cow.type] || C.lavender}18`, color: typeColors[cow.type] || C.lavender }}>{cow.type}</span>
                          <div className="flex flex-wrap gap-1">
                            {cow.pills.map((p) => (
                              <span key={p.text} className="uppercase rounded-full px-2 py-0.5" style={{
                                fontSize: 9, fontWeight: 700, letterSpacing: "0.04em",
                                backgroundColor: (pillStyles[p.tier] || pillStyles.management).bg,
                                color: (pillStyles[p.tier] || pillStyles.management).color,
                              }}>{p.text}</span>
                            ))}
                          </div>
                        </div>
                        <Chevron />
                      </button>
                      {i < flagData.flagged.length - 1 && <div className="h-px" style={{ backgroundColor: "rgba(212,212,208,0.3)" }} />}
                    </div>
                  ))}
                </WCard>
              </>}

              {/* Bull Roster */}
              <Divider title="Bull Roster" />
              <WCard style={{ padding: 0 }}>
                <div className="px-3.5 pt-3 pb-1 flex items-center justify-between">
                  <Lbl>{m.bulls} Active Bulls</Lbl>
                </div>
                {m.bullRoster.slice(0, 15).map((b, idx) => (
                  <div key={b.id}>
                    {idx > 0 && <div className="h-px mx-3.5" style={{ backgroundColor: "rgba(212,212,208,0.3)" }} />}
                    <button onClick={() => nav(`/animals/${b.id}`)}
                      className="w-full flex items-center justify-between px-3.5 py-2.5 cursor-pointer"
                      style={{ background: "none", border: "none" }}>
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{b.tag}</span>
                        {b.name && <span className="truncate" style={{ fontSize: 11, fontWeight: 500, color: "rgba(26,26,26,0.4)" }}>{b.name}</span>}
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        {b.breed && <span style={{ fontSize: 10, color: "rgba(26,26,26,0.35)" }}>{b.breed}</span>}
                        {b.age != null && <span style={{ fontSize: 10, fontWeight: 600, color: C.royalBlue }}>{b.age}yr</span>}
                        <Chevron />
                      </div>
                    </button>
                  </div>
                ))}
                {m.bulls > 15 && (
                  <div className="text-center py-2" style={{ borderTop: "1px solid rgba(212,212,208,0.2)" }}>
                    <button onClick={() => setTab("Records")} className="cursor-pointer" style={{ fontSize: 11, fontWeight: 500, color: C.royalBlue, background: "none", border: "none" }}>
                      View all {m.bulls} bulls →
                    </button>
                  </div>
                )}
              </WCard>

              {/* Sire Breakdown — hidden if no sire data */}
              {m.hasSireData && <>
                <Divider title="Sire Breakdown" />
                <WCard>
                  <Lbl>Cows by Sire</Lbl>
                  <Sub>Sire data available — breakdown to be built when sire linkage is complete.</Sub>
                </WCard>
              </>}

              {/* Records link */}
              <WCard>
                <button onClick={() => setTab("Records")} className="w-full flex items-center justify-between cursor-pointer" style={{ background: "none", border: "none" }}>
                  <div><p style={{ fontSize: 14, fontWeight: 600, color: C.navy }}>View all animals</p><p style={{ fontSize: 12, fontWeight: 500, color: "rgba(26,26,26,0.35)" }}>{m.total} active · all types</p></div>
                  <Chevron />
                </button>
              </WCard>

            </div>
          )}
        </>
      )}

      {/* ═══════ HERD ANALYSIS TAB ═══════ */}
      {tab === "Herd Analysis" && (
        <>
          {isLoading || !m ? (
            <div className="flex flex-col gap-3"><Skeleton /><Skeleton /></div>
          ) : (
            <div className="flex flex-col gap-3 pb-10">

              {/* Breed Distribution */}
              <Divider title="Breed Distribution" />
              <WCard>
                <Lbl>Active Herd by Breed</Lbl>
                <div style={{ width: "100%", height: 180 }} className="mt-2">
                  <ResponsiveContainer>
                    <BarChart data={m.breedBreakdown.slice(0, 8)} margin={{ top: 4, right: 4, left: -10, bottom: 0 }} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(14,38,70,0.06)" />
                      <XAxis type="number" tick={{ fontSize: 8, fill: "rgba(26,26,26,0.35)" }} axisLine={false} tickLine={false} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 9, fill: "rgba(26,26,26,0.5)" }} axisLine={false} tickLine={false} width={110} />
                      <Tooltip content={<Tip />} />
                      <Bar dataKey="count" radius={[0, 4, 4, 0]} name="Head">
                        {m.breedBreakdown.slice(0, 8).map((_, i) => <Cell key={i} fill={breedColors[i % breedColors.length]} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </WCard>

              {/* Type breakdown by breed */}
              <Divider title="Type Composition" />
              <WCard>
                <Lbl>Animals by Type</Lbl>
                <div style={{ width: "100%", height: 160 }} className="mt-2">
                  <ResponsiveContainer>
                    <BarChart data={m.typeBreakdown} margin={{ top: 4, right: 4, left: -22, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(14,38,70,0.06)" />
                      <XAxis dataKey="name" tick={{ fontSize: 9, fill: "rgba(26,26,26,0.35)" }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 8, fill: "rgba(26,26,26,0.35)" }} axisLine={false} tickLine={false} />
                      <Tooltip content={<Tip />} />
                      <Bar dataKey="value" radius={[4, 4, 0, 0]} name="Head">
                        {m.typeBreakdown.map((t, i) => <Cell key={i} fill={t.color} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <Legend data={m.typeBreakdown} />
              </WCard>

              {/* Cow age detail */}
              <Divider title="Cow Age Profile" />
              <WCard>
                <Lbl>Active Cows by Age</Lbl>
                <div style={{ width: "100%", height: 160 }} className="mt-2">
                  <ResponsiveContainer>
                    <BarChart data={m.cowAgeDist} margin={{ top: 4, right: 4, left: -22, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(14,38,70,0.06)" />
                      <XAxis dataKey="range" tick={{ fontSize: 9, fill: "rgba(26,26,26,0.35)" }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 8, fill: "rgba(26,26,26,0.35)" }} axisLine={false} tickLine={false} />
                      <Tooltip content={<Tip />} />
                      <Bar dataKey="count" radius={[4, 4, 0, 0]} name="Cows" fill={C.royalBlue} fillOpacity={0.85} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="grid grid-cols-3 gap-2 mt-3">
                  {[
                    { l: "Avg Age", v: m.avgCowAge ? `${m.avgCowAge} yr` : "—" },
                    { l: "Youngest", v: m.youngestCow ? `${m.youngestCow} yr` : "—" },
                    { l: "Oldest", v: m.oldestCow ? `${m.oldestCow} yr` : "—" },
                  ].map((x) => (
                    <div key={x.l} className="text-center rounded-lg py-2 px-1 bg-white border border-[#D4D4D0]/60">
                      <p className="uppercase" style={{ fontSize: 9, fontWeight: 600, color: "rgba(26,26,26,0.35)", letterSpacing: "0.06em" }}>{x.l}</p>
                      <p style={{ fontSize: 15, fontWeight: 700, color: C.navy, lineHeight: 1.4 }}>{x.v}</p>
                    </div>
                  ))}
                </div>
              </WCard>

              {/* Calf crop summary */}
              <Divider title="Calf Crop" />
              <WCard>
                <div className="flex items-start justify-between">
                  <div>
                    <Lbl>Active Calves</Lbl>
                    <div className="flex items-baseline gap-1.5 mt-1"><Big value={String(m.calves)} /></div>
                    <Sub>{m.bullCalves} bull calves · {m.heiferCalves} heifer calves</Sub>
                  </div>
                  <div className="text-right">
                    <Lbl>Replacements</Lbl>
                    <div className="flex items-baseline gap-1.5 mt-1 justify-end"><Big value={String(m.replacements)} size={22} /></div>
                    <Sub>developing heifers</Sub>
                  </div>
                </div>
              </WCard>

              {/* Feeder summary */}
              {m.feeders > 0 && (
                <WCard>
                  <div className="flex items-start justify-between">
                    <div>
                      <Lbl>Feeders</Lbl>
                      <div className="flex items-baseline gap-1.5 mt-1"><Big value={String(m.feeders)} size={22} /></div>
                      <Sub>active steers</Sub>
                    </div>
                  </div>
                </WCard>
              )}

            </div>
          )}
        </>
      )}

      {/* ═══════ RECORDS TAB ═══════ */}
      {tab === "Records" && <AnimalsScreen />}
    </div>
  );
}
