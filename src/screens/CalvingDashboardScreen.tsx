/**
 * CalvingDashboardScreen — replaces CalvingScreen as the /calving landing page.
 * Three tabs: This Season (analytics), Compare (year-over-year), Records (existing CalvingScreen).
 *
 * All data comes from calving_records + animal_flags via Supabase.
 * No mock data. Every chart driven by real queries scoped to operation_id + year.
 *
 * Renders inside AppLayout (which provides header, hamburger nav, max-w-xl wrapper).
 * Does NOT render its own header — AppLayout handles "Calving" title + back nav.
 */
import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOperation } from "@/contexts/OperationContext";
import CalvingScreen from "@/screens/CalvingScreen";
import {
  XAxis, YAxis, Tooltip, ResponsiveContainer, Area, AreaChart,
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

/* ═══════════════ TINY PRIMITIVES ═══════════════ */
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
const fmt = (d: Date | null) => d ? d.toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "—";
const DAY_MS = 86400000;

/* ═══════════════ DATA HOOKS ═══════════════ */

function useSeasonData(operationId: string, year: number) {
  return useQuery({
    queryKey: ["calving-dash", operationId, year],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("calving_records")
        .select("calving_date, calf_status, calf_sex, birth_weight, assistance, death_explanation", { count: "exact" })
        .eq("operation_id", operationId)
        .gte("calving_date", `${year}-01-01`)
        .lte("calving_date", `${year}-12-31`);
      if (error) throw error;
      return data || [];
    },
    enabled: !!operationId,
  });
}

function usePriorYear(operationId: string, year: number) {
  return useQuery({
    queryKey: ["calving-dash-prior", operationId, year - 1],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("calving_records")
        .select("calving_date, calf_status")
        .eq("operation_id", operationId)
        .gte("calving_date", `${year - 1}-01-01`)
        .lte("calving_date", `${year - 1}-12-31`);
      if (error) throw error;
      return data || [];
    },
    enabled: !!operationId,
  });
}

function useFlaggedDams(operationId: string, year: number) {
  return useQuery({
    queryKey: ["calving-dash-flags", operationId, year],
    queryFn: async () => {
      // 1. Get dam IDs that calved this year
      const { data: recs } = await supabase
        .from("calving_records")
        .select("dam_id")
        .eq("operation_id", operationId)
        .gte("calving_date", `${year}-01-01`)
        .lte("calving_date", `${year}-12-31`);
      const ids = [...new Set((recs || []).map((r) => r.dam_id))];
      if (!ids.length) return [];

      // 2. Active flags on those dams
      const { data: flags } = await supabase
        .from("animal_flags")
        .select("animal_id, flag_tier, flag_name")
        .eq("operation_id", operationId)
        .is("resolved_at", null)
        .in("animal_id", ids);
      const fIds = [...new Set((flags || []).map((f) => f.animal_id))];
      if (!fIds.length) return [];

      // 3. Get tags
      const { data: animals } = await supabase
        .from("animals")
        .select("id, tag")
        .in("id", fIds);
      const tagMap: Record<string, string> = {};
      (animals || []).forEach((a) => { tagMap[a.id] = a.tag; });

      // 4. Group by animal
      const grouped: Record<string, { tag: string; id: string; pills: { text: string; tier: string }[] }> = {};
      (flags || []).forEach((f) => {
        if (!grouped[f.animal_id]) grouped[f.animal_id] = { tag: tagMap[f.animal_id] || "?", id: f.animal_id, pills: [] };
        grouped[f.animal_id].pills.push({ text: f.flag_name, tier: f.flag_tier });
      });
      return Object.values(grouped);
    },
    enabled: !!operationId,
  });
}

/* ═══════════════ COMPARE DATA HOOK ═══════════════ */
interface YearSummary {
  yr: number;
  total: number;
  alive: number;
  dead: number;
  deathPct: string;
  avgWt: string | null;
  hardPulls: number;
  hardPullPct: string;
  bulls: number;
  heifers: number;
  bullPct: string;
  heiferPct: string;
  firstCalf: string | null;
  lastCalf: string | null;
  seasonDays: number;
  dailyCurve: { dayOfYear: number; d: string; births: number }[];
}

function useCompareData(operationId: string, years: number[]) {
  return useQuery({
    queryKey: ["calving-compare", operationId, years.join(",")],
    queryFn: async () => {
      if (!years.length) return [];
      // Fetch all records for all selected years at once
      const minYear = Math.min(...years);
      const maxYear = Math.max(...years);
      const { data, error } = await supabase
        .from("calving_records")
        .select("calving_date, calf_status, calf_sex, birth_weight, assistance")
        .eq("operation_id", operationId)
        .gte("calving_date", `${minYear}-01-01`)
        .lte("calving_date", `${maxYear}-12-31`);
      if (error) throw error;

      // Group by year and compute summaries
      const byYear: Record<number, any[]> = {};
      (data || []).forEach((r) => {
        const yr = new Date(r.calving_date + "T00:00:00").getFullYear();
        if (years.includes(yr)) {
          if (!byYear[yr]) byYear[yr] = [];
          byYear[yr].push(r);
        }
      });

      return years.map((yr): YearSummary => {
        const recs = byYear[yr] || [];
        const total = recs.length;
        const alive = recs.filter((r) => r.calf_status === "Alive").length;
        const dead = total - alive;
        const wts = recs.filter((r) => r.birth_weight != null).map((r) => Number(r.birth_weight));
        const avgWt = wts.length ? (wts.reduce((a, b) => a + b, 0) / wts.length).toFixed(1) : null;
        const hardPulls = recs.filter((r) => r.assistance != null && r.assistance >= 3).length;
        const bulls = recs.filter((r) => r.calf_sex === "Bull").length;
        const heifers = recs.filter((r) => r.calf_sex === "Heifer").length;
        const dates = recs.map((r) => r.calving_date).sort();
        const firstCalf = dates[0] || null;
        const lastCalf = dates[dates.length - 1] || null;
        const seasonDays = firstCalf && lastCalf ? Math.floor((new Date(lastCalf + "T00:00:00").getTime() - new Date(firstCalf + "T00:00:00").getTime()) / DAY_MS) : 0;

        // Daily curve normalized to day-of-year for overlay alignment
        const dayMap: Record<string, number> = {};
        recs.forEach((r) => { dayMap[r.calving_date] = (dayMap[r.calving_date] || 0) + 1; });
        const dailyCurve = Object.entries(dayMap).sort(([a], [b]) => a.localeCompare(b)).map(([d, n]) => {
          const dt = new Date(d + "T00:00:00");
          const jan1 = new Date(dt.getFullYear(), 0, 1);
          const dayOfYear = Math.ceil((dt.getTime() - jan1.getTime()) / DAY_MS) + 1;
          return { dayOfYear, d: dt.toLocaleDateString("en-US", { month: "short", day: "numeric" }), births: n };
        });

        return {
          yr, total, alive, dead,
          deathPct: total > 0 ? (dead / total * 100).toFixed(1) : "0",
          avgWt, hardPulls,
          hardPullPct: total > 0 ? (hardPulls / total * 100).toFixed(1) : "0",
          bulls, heifers,
          bullPct: total > 0 ? Math.round(bulls / total * 100).toString() : "0",
          heiferPct: total > 0 ? Math.round(heifers / total * 100).toString() : "0",
          firstCalf, lastCalf, seasonDays, dailyCurve,
        };
      });
    },
    enabled: !!operationId && years.length > 0,
  });
}

/* ═══════════════ COMPUTE METRICS ═══════════════ */
function useMetrics(raw: any[] | undefined, year: number) {
  return useMemo(() => {
    if (!raw || !raw.length) return null;
    const total = raw.length;
    const alive = raw.filter((r) => r.calf_status === "Alive").length;
    const dead = total - alive;
    const bulls = raw.filter((r) => r.calf_sex === "Bull").length;
    const heifers = raw.filter((r) => r.calf_sex === "Heifer").length;
    const unknown = total - bulls - heifers;

    const wts = raw.filter((r) => r.birth_weight != null).map((r) => Number(r.birth_weight));
    const avg = (arr: number[]) => arr.length ? (arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(1) : null;
    const avgWt = avg(wts);
    const avgBullWt = avg(raw.filter((r) => r.calf_sex === "Bull" && r.birth_weight != null).map((r) => Number(r.birth_weight)));
    const avgHeiferWt = avg(raw.filter((r) => r.calf_sex === "Heifer" && r.birth_weight != null).map((r) => Number(r.birth_weight)));

    const timestamps = raw.map((r) => new Date(r.calving_date + "T00:00:00").getTime());
    const firstCalf = new Date(Math.min(...timestamps));
    const lastCalf = new Date(Math.max(...timestamps));
    const today = new Date();
    const daysIn = Math.floor((today.getTime() - firstCalf.getTime()) / DAY_MS);

    const noAssist = raw.filter((r) => r.assistance === 1 || r.assistance == null).length;
    const easyPull = raw.filter((r) => r.assistance === 2).length;
    const hardPull = raw.filter((r) => r.assistance != null && r.assistance >= 3).length;

    const deathEx: Record<string, number> = {};
    raw.filter((r) => r.calf_status === "Dead").forEach((r) => {
      const k = r.death_explanation || "Unknown";
      deathEx[k] = (deathEx[k] || 0) + 1;
    });

    const ages = raw.filter((r) => r.calf_status === "Alive")
      .map((r) => Math.floor((today.getTime() - new Date(r.calving_date + "T00:00:00").getTime()) / DAY_MS));
    const avgAge = ages.length ? Math.round(ages.reduce((a, b) => a + b, 0) / ages.length) : 0;
    const oldestAge = ages.length ? Math.max(...ages) : 0;
    const youngestAge = ages.length ? Math.min(...ages) : 0;

    // Daily curve
    const dayMap: Record<string, number> = {};
    raw.forEach((r) => { dayMap[r.calving_date] = (dayMap[r.calving_date] || 0) + 1; });
    const dailyCurve = Object.entries(dayMap).sort(([a], [b]) => a.localeCompare(b))
      .map(([d, n]) => ({ d: new Date(d + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" }), births: n, raw: d }));

    // Week helper
    const wk = (d: string) => Math.ceil((new Date(d + "T00:00:00").getTime() - new Date(year, 0, 1).getTime()) / (7 * DAY_MS));

    // Weekly alive/dead
    const wkAD: Record<number, { alive: number; dead: number }> = {};
    raw.forEach((r) => { const w = wk(r.calving_date); if (!wkAD[w]) wkAD[w] = { alive: 0, dead: 0 }; r.calf_status === "Alive" ? wkAD[w].alive++ : wkAD[w].dead++; });
    const weeklyDist = Object.entries(wkAD).sort(([a], [b]) => +a - +b).map(([w, v]) => ({ w: `Wk ${w}`, ...v }));

    // Weekly by sex
    const wkS: Record<number, { bulls: number; heifers: number }> = {};
    raw.forEach((r) => { const w = wk(r.calving_date); if (!wkS[w]) wkS[w] = { bulls: 0, heifers: 0 }; if (r.calf_sex === "Bull") wkS[w].bulls++; else if (r.calf_sex === "Heifer") wkS[w].heifers++; });
    const weeklyBySex = Object.entries(wkS).sort(([a], [b]) => +a - +b).map(([w, v]) => ({ w: `Wk ${w}`, ...v }));

    // Weight buckets
    const bk = [{ r: "<60", lo: 0, hi: 59 }, { r: "60-69", lo: 60, hi: 69 }, { r: "70-79", lo: 70, hi: 79 }, { r: "80-89", lo: 80, hi: 89 }, { r: "90-99", lo: 90, hi: 99 }, { r: "100+", lo: 100, hi: 9999 }];
    const weightBuckets = bk.map((b) => ({ range: b.r, count: wts.filter((w) => w >= b.lo && w <= b.hi).length }));

    // Age buckets
    const ab = [{ r: "0-7d", lo: 0, hi: 7 }, { r: "8-14d", lo: 8, hi: 14 }, { r: "15-21d", lo: 15, hi: 21 }, { r: "22-28d", lo: 22, hi: 28 }, { r: "29-42d", lo: 29, hi: 42 }, { r: "43-56d", lo: 43, hi: 56 }, { r: "57d+", lo: 57, hi: 9999 }];
    const ageDist = ab.map((b) => ({ range: b.r, count: ages.filter((a) => a >= b.lo && a <= b.hi).length })).filter((b) => b.count > 0);

    return {
      total, alive, dead, bulls, heifers, unknown,
      avgWt, avgBullWt, avgHeiferWt,
      firstCalf, lastCalf, daysIn,
      noAssist, easyPull, hardPull, deathEx,
      avgAge, oldestAge, youngestAge,
      dailyCurve, weeklyDist, weeklyBySex, weightBuckets, ageDist,
    };
  }, [raw, year]);
}

/* ═══════════════ CALVING CURVE (has overlay toggle state) ═══════════════ */
function CurveChart({ current, prior }: { current: any[]; prior?: any[] }) {
  const [overlay, setOverlay] = useState(false);
  const merged = current.map((c) => {
    const p = prior?.find((p) => {
      const cd = new Date(c.raw); const pd = new Date(p.raw);
      return cd.getMonth() === pd.getMonth() && cd.getDate() === pd.getDate();
    });
    return { ...c, prior: p?.births || 0 };
  });
  return (
    <WCard>
      <div className="flex items-center justify-between mb-2">
        <Lbl>Daily Calving Curve</Lbl>
        {prior && prior.length > 0 && (
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input type="checkbox" checked={overlay} onChange={(e) => setOverlay(e.target.checked)} className="rounded" style={{ accentColor: C.antiqueGold, width: 14, height: 14 }} />
            <span style={{ fontSize: 11, fontWeight: 500, color: "rgba(26,26,26,0.4)" }}>vs prior year</span>
          </label>
        )}
      </div>
      <div style={{ width: "100%", height: 180 }}>
        <ResponsiveContainer>
          <AreaChart data={merged} margin={{ top: 4, right: 4, left: -22, bottom: 0 }}>
            <defs><linearGradient id="cf" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={C.royalBlue} stopOpacity={0.15} /><stop offset="95%" stopColor={C.royalBlue} stopOpacity={0.01} /></linearGradient></defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(14,38,70,0.06)" />
            <XAxis dataKey="d" tick={{ fontSize: 8, fill: "rgba(26,26,26,0.35)" }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
            <YAxis tick={{ fontSize: 8, fill: "rgba(26,26,26,0.35)" }} axisLine={false} tickLine={false} />
            <Tooltip content={<Tip />} />
            <Area type="monotone" dataKey="births" stroke={C.royalBlue} strokeWidth={2.5} fill="url(#cf)" name="This Year" />
            {overlay && <Area type="monotone" dataKey="prior" stroke={C.antiqueGold} strokeWidth={1.5} strokeDasharray="5 3" fill="none" name="Prior Year" />}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </WCard>
  );
}

/* ═══════════════ MAIN SCREEN ═══════════════ */
export default function CalvingDashboardScreen() {
  const [tab, setTab] = useState("This Season");
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [yearOpen, setYearOpen] = useState(false);
  const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear - i);
  const [search, setSearch] = useState("");
  const [compareYears, setCompareYears] = useState<number[]>([currentYear, currentYear - 1]);
  const { operationId } = useOperation();
  const nav = useNavigate();

  // Expected head count: prior year's total born (future: from calving group config)
  const { data: priorRaw } = usePriorYear(operationId, year);
  const expectedHead = priorRaw?.length || 0;

  const { data: raw, isLoading } = useSeasonData(operationId, year);
  const { data: flagged } = useFlaggedDams(operationId, year);
  const m = useMetrics(raw, year);
  const { data: compareData, isLoading: compareLoading } = useCompareData(operationId, compareYears);

  // Prior year stats for Live Calf % comparison
  const priorDead = priorRaw ? priorRaw.filter((r) => r.calf_status === "Dead").length : 0;
  const priorTotal = priorRaw?.length || 0;
  const priorLivePct = priorTotal > 0 ? ((priorTotal - priorDead) / priorTotal * 100).toFixed(1) : null;

  // Prior year daily curve for overlay
  const priorCurve = useMemo(() => {
    if (!priorRaw?.length) return undefined;
    const dm: Record<string, number> = {};
    priorRaw.forEach((r) => { dm[r.calving_date] = (dm[r.calving_date] || 0) + 1; });
    return Object.entries(dm).sort(([a], [b]) => a.localeCompare(b))
      .map(([d, n]) => ({ d: new Date(d + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" }), births: n, raw: d }));
  }, [priorRaw]);

  // Breeding date estimates
  const bullsIn = m?.firstCalf ? new Date(m.firstCalf.getTime() - 280 * DAY_MS) : null;
  const bullsOut = bullsIn ? new Date(bullsIn.getTime() + 75 * DAY_MS) : null;
  const expectedLast = bullsOut ? new Date(bullsOut.getTime() + 280 * DAY_MS) : null;
  const daysLeft = expectedLast ? Math.max(0, Math.ceil((expectedLast.getTime() - Date.now()) / DAY_MS)) : null;
  const pct = m && expectedHead > 0 ? (m.total / expectedHead * 100).toFixed(1) : "—";

  // Search — query calving records matching dam tag, calf tag, or memo
  const { data: searchResults } = useQuery({
    queryKey: ["calving-dash-search", operationId, year, search],
    queryFn: async () => {
      if (!search || search.length < 2) return [];
      const q = search.toLowerCase();
      // Fetch records for the year with dam join
      const { data, error } = await supabase
        .from("calving_records")
        .select("id, calving_date, calf_tag, calf_sex, calf_status, memo, dam:animals!calving_records_dam_id_fkey(tag)")
        .eq("operation_id", operationId)
        .gte("calving_date", `${year}-01-01`)
        .lte("calving_date", `${year}-12-31`)
        .limit(2000);
      if (error) throw error;
      return (data || []).filter((r) => {
        const damTag = ((r.dam as any)?.tag || "").toLowerCase();
        const calfTag = (r.calf_tag || "").toLowerCase();
        const memo = (r.memo || "").toLowerCase();
        return damTag.includes(q) || calfTag.includes(q) || memo.includes(q);
      }).slice(0, 20);
    },
    enabled: !!operationId && search.length >= 2,
  });

  // Death cause pie
  const deathColors = [C.royalBlue, C.deepPurple, C.antiqueGold, C.crimson, C.burgundy, C.lavender, C.teal, "#8B5FBF", C.border];
  const deathPie = m ? Object.entries(m.deathEx).sort(([, a], [, b]) => b - a)
    .map(([name, value], i) => ({ name, value, color: deathColors[i % deathColors.length], pct: m.dead > 0 ? Math.round((value / m.dead) * 100) : 0 })) : [];

  return (
    <div className="px-4">
      {/* Tab bar */}
      <div className="flex -mx-4 bg-white" style={{ borderBottom: "1px solid #D4D4D0", paddingLeft: 16, marginTop: -20 }}>
        {["This Season", "Compare", "Records"].map((t) => (
          <button key={t} onClick={() => setTab(t)} className="cursor-pointer"
            style={{ padding: "10px 16px", fontSize: 13, fontWeight: 600, background: "none", border: "none",
              color: tab === t ? C.navy : "rgba(26,26,26,0.4)",
              borderBottom: tab === t ? `2.5px solid ${C.yellow}` : "2.5px solid transparent",
            }}>{t}</button>
        ))}
      </div>

      {/* Search bar + Add New */}
      <div className="flex items-center gap-2 mt-3 mb-2">
        <div className="relative flex-1">
          <div className="absolute" style={{ left: 14, top: 22, transform: "translateY(-50%)", pointerEvents: "none" }}>
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="rgba(26,26,26,0.3)" strokeWidth="2" strokeLinecap="round"><circle cx="8.5" cy="8.5" r="6" /><path d="M13 13l4.5 4.5" /></svg>
          </div>
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by dam tag, calf tag, or memo…" className="w-full outline-none"
            style={{ height: 44, borderRadius: 22, border: "1px solid #D4D4D0", background: "#FFF", padding: "0 16px 0 42px", fontSize: 14, fontFamily: "Inter, sans-serif", color: C.text }}
            onFocus={(e) => { e.currentTarget.style.borderColor = C.yellow; e.currentTarget.style.boxShadow = "0 0 0 2px rgba(243,209,42,0.25)"; }}
            onBlur={(e) => { setTimeout(() => { e.currentTarget.style.borderColor = "#D4D4D0"; e.currentTarget.style.boxShadow = "none"; }, 150); }}
          />
          {/* Search results dropdown */}
          {search.length >= 2 && searchResults && searchResults.length > 0 && (
          <div className="absolute left-0 right-0 bg-white border border-[#D4D4D0] rounded-xl mt-1 shadow-lg overflow-hidden" style={{ zIndex: 20, maxHeight: 260, overflowY: "auto" }}>
            {searchResults.map((r: any) => (
              <button key={r.id} onClick={() => { nav(`/calving/${r.id}`); setSearch(""); }}
                className="w-full flex items-center justify-between px-4 py-2.5 cursor-pointer hover:bg-gray-50"
                style={{ background: "none", border: "none", borderBottom: "1px solid rgba(212,212,208,0.2)" }}>
                <div className="flex items-center gap-3">
                  <span style={{ fontSize: 13, fontWeight: 600, color: C.navy }}>{(r.dam as any)?.tag || "?"}</span>
                  <span style={{ fontSize: 11, color: "rgba(26,26,26,0.4)" }}>→</span>
                  <span style={{ fontSize: 13, fontWeight: 500, color: C.text }}>{r.calf_tag || "no tag"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span style={{ fontSize: 10, color: r.calf_status === "Dead" ? C.crimson : "rgba(26,26,26,0.35)" }}>{r.calf_status}</span>
                  <span style={{ fontSize: 10, color: "rgba(26,26,26,0.25)" }}>{new Date(r.calving_date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                </div>
              </button>
            ))}
          </div>
        )}
        {search.length >= 2 && searchResults && searchResults.length === 0 && (
          <div className="absolute left-0 right-0 bg-white border border-[#D4D4D0] rounded-xl mt-1 shadow-lg px-4 py-3" style={{ zIndex: 20 }}>
            <p style={{ fontSize: 12, color: "rgba(26,26,26,0.4)" }}>No records match "{search}"</p>
          </div>
        )}
        </div>
        <button onClick={() => nav("/calving/new")} type="button"
          style={{ width: 44, height: 44, borderRadius: "50%", border: "none", backgroundColor: C.navy, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><path d="M10 4v12M4 10h12" /></svg>
        </button>
      </div>

      {/* Year picker */}
      {tab === "This Season" && (
        <div className="flex gap-1.5 mb-2" style={{ alignItems: "center" }}>
          {!yearOpen ? (
            <button onClick={() => setYearOpen(true)}
              className="cursor-pointer active:scale-[0.97]"
              style={{ padding: "5px 14px", borderRadius: 20, fontSize: 12, fontWeight: 600, border: "none", background: C.navy, color: "#FFF", display: "flex", alignItems: "center", gap: 5 }}>
              {year}
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2.5 3.75L5 6.25L7.5 3.75" stroke="#FFF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
          ) : (
            yearOptions.map((y) => (
              <button key={y} onClick={() => { setYear(y); setYearOpen(false); }}
                className="cursor-pointer active:scale-[0.97]"
                style={{
                  padding: "5px 14px", borderRadius: 20, fontSize: 12, fontWeight: 600, border: year === y ? "none" : "1px solid #D4D4D0",
                  background: year === y ? C.navy : "transparent", color: year === y ? "#FFF" : "rgba(26,26,26,0.5)", cursor: "pointer",
                }}>
                {y}
              </button>
            ))
          )}
        </div>
      )}

      {/* ═══════ THIS SEASON TAB ═══════ */}
      {tab === "This Season" && (
        <>
          {isLoading || !m ? (
            <div className="flex flex-col gap-3"><Skeleton /><Skeleton /><Skeleton /></div>
          ) : (
            <div className="flex flex-col gap-3 pb-10">

              {/* Season Banner */}
              <div className="rounded-xl overflow-hidden" style={{ background: `linear-gradient(145deg, ${C.navy} 0%, ${C.navyMid} 55%, ${C.teal} 100%)` }}>
                <div className="px-4 pt-4 pb-3">
                  <div className="flex items-end justify-between">
                    <div>
                      <p className="uppercase" style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.08em", color: "rgba(255,255,255,0.3)" }}>{year} Calving Season</p>
                      <p style={{ fontSize: 42, fontWeight: 800, color: "#fff", lineHeight: 1, letterSpacing: "-0.03em", marginTop: 4 }}>{m.total}</p>
                      <p style={{ fontSize: 12, fontWeight: 500, color: C.tealLight, marginTop: 4 }}>
                        calves born{expectedHead > 0 ? ` of ${expectedHead} expected` : ""}
                      </p>
                    </div>
                    {expectedHead > 0 && (
                      <div className="text-right">
                        <p style={{ fontSize: 36, fontWeight: 800, color: C.yellow, lineHeight: 1 }}>{pct}<span style={{ fontSize: 18 }}>%</span></p>
                        <p style={{ fontSize: 10, fontWeight: 500, color: "rgba(255,255,255,0.4)", marginTop: 2 }}>complete</p>
                      </div>
                    )}
                  </div>
                  {expectedHead > 0 && (
                    <div className="w-full rounded-full overflow-hidden mt-4" style={{ height: 8, backgroundColor: "rgba(255,255,255,0.1)" }}>
                      <div className="h-full rounded-full" style={{ width: `${Math.min(100, +pct)}%`, background: `linear-gradient(90deg, ${C.yellow} 0%, ${C.tealLight} 100%)` }} />
                    </div>
                  )}
                  <div className="flex justify-between mt-1.5" style={{ fontSize: 9, fontWeight: 600, color: "rgba(255,255,255,0.3)" }}>
                    <span>{fmt(m.firstCalf)} · Day {m.daysIn}</span>
                    {daysLeft !== null && <span style={{ color: C.tealLight }}>{daysLeft > 0 ? `${daysLeft} days remain` : "Season complete"}</span>}
                    <span>{fmt(expectedLast)} est.</span>
                  </div>
                  {bullsIn && (
                    <div className="flex justify-between mt-3 pt-2" style={{ borderTop: "1px solid rgba(255,255,255,0.08)", fontSize: 9, color: "rgba(255,255,255,0.25)" }}>
                      <span>Bulls in {fmt(bullsIn)} · Out {fmt(bullsOut)}</span>
                      <span>280d gestation</span>
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-5" style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}>
                  {[
                    { l: "Alive", v: String(m.alive), c: C.tealLight },
                    { l: "Dead", v: String(m.dead), c: "#FF8A80" },
                    { l: "Bulls", v: String(m.bulls), c: "#fff" },
                    { l: "Heifers", v: String(m.heifers), c: "#fff" },
                    { l: "Avg Age", v: `${m.avgAge}d`, c: "#fff" },
                  ].map((s, i) => (
                    <div key={s.l} className="text-center py-2.5" style={{ borderRight: i < 4 ? "1px solid rgba(255,255,255,0.06)" : "none" }}>
                      <p style={{ fontSize: 16, fontWeight: 800, color: s.c, lineHeight: 1.1 }}>{s.v}</p>
                      <p className="uppercase" style={{ fontSize: 8, fontWeight: 600, letterSpacing: "0.06em", color: "rgba(255,255,255,0.25)" }}>{s.l}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Live Calf % */}
              <WCard>
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <Lbl>Live Calf %</Lbl>
                    <div className="flex items-baseline gap-2 mt-1">
                      <Big value={`${(m.alive / m.total * 100).toFixed(1)}%`} color={C.teal} />
                      <span style={{ fontSize: 11, fontWeight: 600, color: C.teal }}>{m.alive} alive</span>
                    </div>
                    <Sub>of {m.total} born · {m.dead} dead ({(m.dead / m.total * 100).toFixed(1)}%)</Sub>
                  </div>
                  {priorLivePct && (
                    <div className="text-right">
                      <p style={{ fontSize: 10, fontWeight: 600, color: "rgba(26,26,26,0.3)" }}>LAST YEAR</p>
                      <p style={{ fontSize: 18, fontWeight: 700, color: "rgba(26,26,26,0.25)" }}>{priorLivePct}%</p>
                    </div>
                  )}
                </div>
                <div className="relative w-full mt-1" style={{ height: 10 }}>
                  <div className="absolute inset-0 rounded-full" style={{ backgroundColor: "rgba(14,38,70,0.06)" }} />
                  <div className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${(m.alive / m.total * 100).toFixed(1)}%`, background: `linear-gradient(90deg, ${C.royalBlue} 0%, ${C.teal} 100%)` }} />
                </div>
              </WCard>

              {/* Calving Distribution */}
              <Divider title="Calving Distribution" />
              <WCard>
                <Lbl>Weekly Alive / Dead</Lbl>
                <div style={{ width: "100%", height: 160 }} className="mt-2">
                  <ResponsiveContainer><BarChart data={m.weeklyDist} margin={{ top: 4, right: 4, left: -22, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(14,38,70,0.06)" />
                    <XAxis dataKey="w" tick={{ fontSize: 8, fill: "rgba(26,26,26,0.35)" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 8, fill: "rgba(26,26,26,0.35)" }} axisLine={false} tickLine={false} />
                    <Tooltip content={<Tip />} />
                    <Bar dataKey="alive" stackId="s" fill={C.royalBlue} name="Alive" />
                    <Bar dataKey="dead" stackId="s" fill={C.crimson} radius={[3, 3, 0, 0]} name="Dead" />
                  </BarChart></ResponsiveContainer>
                </div>
                <Legend data={[{ name: "Alive", value: m.alive, color: C.royalBlue }, { name: "Dead", value: m.dead, color: C.crimson }]} />
              </WCard>

              {/* Death Breakdown */}
              {m.dead > 0 && <>
                <Divider title="Death Breakdown" />
                <WCard>
                  <Lbl>Cause of Death</Lbl>
                  <div className="flex items-center gap-2 mt-2">
                    <div style={{ width: 130, height: 130, flexShrink: 0 }}>
                      <ResponsiveContainer><PieChart><Pie data={deathPie} cx="50%" cy="50%" innerRadius={28} outerRadius={52} dataKey="value" paddingAngle={2} strokeWidth={0}>
                        {deathPie.map((e, i) => <Cell key={i} fill={e.color} />)}
                      </Pie><Tooltip content={<Tip />} /></PieChart></ResponsiveContainer>
                    </div>
                    <div className="flex-1 flex flex-col gap-1.5">
                      {deathPie.map((d) => (
                        <div key={d.name} className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <div className="rounded-sm" style={{ width: 7, height: 7, backgroundColor: d.color }} />
                            <span style={{ fontSize: 11, fontWeight: 500, color: "rgba(26,26,26,0.6)" }}>{d.name}</span>
                          </div>
                          <span style={{ fontSize: 12, fontWeight: 700, color: C.text }}>{d.pct}% <span style={{ fontSize: 9, fontWeight: 500, color: "rgba(26,26,26,0.3)" }}>({d.value})</span></span>
                        </div>
                      ))}
                    </div>
                  </div>
                </WCard>
              </>}

              {/* Calving Curve */}
              <Divider title="Calving Curve" />
              <CurveChart current={m.dailyCurve} prior={priorCurve} />

              {/* Sex & Weight */}
              <Divider title="Sex & Weight" />
              <WCard>
                <Lbl>Weekly Births by Sex</Lbl>
                <div style={{ width: "100%", height: 180 }} className="mt-2">
                  <ResponsiveContainer><BarChart data={m.weeklyBySex} margin={{ top: 4, right: 4, left: -22, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(14,38,70,0.06)" />
                    <XAxis dataKey="w" tick={{ fontSize: 8, fill: "rgba(26,26,26,0.35)" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 8, fill: "rgba(26,26,26,0.35)" }} axisLine={false} tickLine={false} />
                    <Tooltip content={<Tip />} />
                    <Bar dataKey="bulls" stackId="s" fill={C.royalBlue} name="Bulls" />
                    <Bar dataKey="heifers" stackId="s" fill={C.antiqueGold} radius={[3, 3, 0, 0]} name="Heifers" />
                  </BarChart></ResponsiveContainer>
                </div>
                <Legend data={[{ name: "Bulls", value: m.bulls, color: C.royalBlue }, { name: "Heifers", value: m.heifers, color: C.antiqueGold }]} />
              </WCard>
              <div className="grid grid-cols-2 gap-3">
                <WCard>
                  <Lbl>Sex Split</Lbl>
                  <div style={{ width: "100%", height: 140 }} className="mt-1">
                    <ResponsiveContainer><PieChart><Pie
                      data={[{ name: "Bulls", value: m.bulls }, { name: "Heifers", value: m.heifers }, ...(m.unknown > 0 ? [{ name: "Unk", value: m.unknown }] : [])]}
                      cx="50%" cy="50%" innerRadius={34} outerRadius={56} dataKey="value" paddingAngle={2} strokeWidth={0}>
                      <Cell fill={C.royalBlue} /><Cell fill={C.antiqueGold} />{m.unknown > 0 && <Cell fill={C.lavender} />}
                    </Pie><Tooltip content={<Tip />} /></PieChart></ResponsiveContainer>
                  </div>
                  <Legend data={[{ name: "Bulls", value: m.bulls, color: C.royalBlue }, { name: "Heifers", value: m.heifers, color: C.antiqueGold }, ...(m.unknown > 0 ? [{ name: "Unk", value: m.unknown, color: C.lavender }] : [])]} />
                </WCard>
                <WCard>
                  <Lbl>Birth Weight (lb)</Lbl>
                  <div style={{ width: "100%", height: 150 }} className="mt-2">
                    <ResponsiveContainer><BarChart data={m.weightBuckets} margin={{ top: 4, right: 4, left: -22, bottom: 0 }}>
                      <XAxis dataKey="range" tick={{ fontSize: 9, fill: "rgba(26,26,26,0.35)" }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 8, fill: "rgba(26,26,26,0.35)" }} axisLine={false} tickLine={false} />
                      <Tooltip content={<Tip />} />
                      <Bar dataKey="count" radius={[4, 4, 0, 0]} name="Calves">
                        {[C.deepPurple, C.deepPurple, C.royalBlue, C.royalBlue, C.antiqueGold, C.crimson].map((c, i) => <Cell key={i} fill={c} />)}
                      </Bar>
                    </BarChart></ResponsiveContainer>
                  </div>
                </WCard>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[{ l: "Avg Weight", v: m.avgWt ? `${m.avgWt} lb` : "—" }, { l: "Bulls Avg", v: m.avgBullWt ? `${m.avgBullWt} lb` : "—" }, { l: "Heifers Avg", v: m.avgHeiferWt ? `${m.avgHeiferWt} lb` : "—" }].map((x) => (
                  <div key={x.l} className="text-center rounded-lg py-2 px-1 bg-white border border-[#D4D4D0]/60">
                    <p className="uppercase" style={{ fontSize: 9, fontWeight: 600, color: "rgba(26,26,26,0.35)", letterSpacing: "0.06em" }}>{x.l}</p>
                    <p style={{ fontSize: 15, fontWeight: 700, color: C.navy, lineHeight: 1.4 }}>{x.v}</p>
                  </div>
                ))}
              </div>

              {/* Assist */}
              <Divider title="Calving Assist" />
              <WCard>
                <Lbl>Assistance Breakdown</Lbl>
                <div style={{ width: "100%", height: 130 }} className="mt-1">
                  <ResponsiveContainer><PieChart><Pie
                    data={[{ name: "No Assist", value: m.noAssist }, { name: "Easy Pull", value: m.easyPull }, { name: "Hard Pull", value: m.hardPull }].filter((d) => d.value > 0)}
                    cx="50%" cy="50%" innerRadius={30} outerRadius={50} dataKey="value" paddingAngle={2} strokeWidth={0}>
                    {[C.royalBlue, C.antiqueGold, C.crimson].map((c, i) => <Cell key={i} fill={c} />)}
                  </Pie><Tooltip content={<Tip />} /></PieChart></ResponsiveContainer>
                </div>
                <Legend data={[{ name: "No Assist", value: m.noAssist, color: C.royalBlue }, { name: "Easy Pull", value: m.easyPull, color: C.antiqueGold }, { name: "Hard Pull", value: m.hardPull, color: C.crimson }]} />
              </WCard>

              {/* Calf Age */}
              <Divider title="Calf Age & Est. Weight" />
              <WCard>
                <div className="flex items-start justify-between">
                  <div>
                    <Lbl>Avg Calf Age</Lbl>
                    <div className="flex items-baseline gap-1.5 mt-1"><Big value={String(m.avgAge)} /><span style={{ fontSize: 14, fontWeight: 600, color: "rgba(26,26,26,0.35)" }}>days</span></div>
                    <Sub>oldest {m.oldestAge}d · youngest {m.youngestAge}d</Sub>
                  </div>
                  <div className="text-right">
                    <Lbl>Est. Avg Weight</Lbl>
                    <div className="flex items-baseline gap-1.5 mt-1 justify-end"><Big value={String(Math.round((m.avgWt ? +m.avgWt : 82) + 2.2 * m.avgAge))} /><span style={{ fontSize: 14, fontWeight: 600, color: "rgba(26,26,26,0.35)" }}>lb</span></div>
                    <Sub>based on 2.2 lb/day ADG</Sub>
                  </div>
                </div>
              </WCard>
              {m.ageDist.length > 0 && (
                <WCard>
                  <Lbl>Calf Age Distribution</Lbl>
                  <div style={{ width: "100%", height: 140 }} className="mt-2">
                    <ResponsiveContainer><BarChart data={m.ageDist} margin={{ top: 4, right: 4, left: -22, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(14,38,70,0.06)" />
                      <XAxis dataKey="range" tick={{ fontSize: 8, fill: "rgba(26,26,26,0.35)" }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 8, fill: "rgba(26,26,26,0.35)" }} axisLine={false} tickLine={false} />
                      <Tooltip content={<Tip />} />
                      <Bar dataKey="count" radius={[4, 4, 0, 0]} name="Calves" fill={C.royalBlue} fillOpacity={0.8} />
                    </BarChart></ResponsiveContainer>
                  </div>
                </WCard>
              )}

              {/* Flagged Cows */}
              {flagged && flagged.length > 0 && <>
                <Divider title="Flagged Cows" />
                <WCard>
                  {flagged.map((cow, i) => (
                    <div key={cow.id}>
                      <button onClick={() => nav(`/animals/${cow.id}`)} className="w-full flex items-center justify-between py-2.5 cursor-pointer" style={{ background: "none", border: "none" }}>
                        <div className="flex items-center gap-2" style={{ minWidth: 0 }}>
                          <span style={{ fontSize: 14, fontWeight: 600, color: C.text, minWidth: 50 }}>{cow.tag}</span>
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
                      {i < flagged.length - 1 && <div className="h-px" style={{ backgroundColor: "rgba(212,212,208,0.3)" }} />}
                    </div>
                  ))}
                </WCard>
              </>}

              {/* Records link */}
              <WCard>
                <button onClick={() => setTab("Records")} className="w-full flex items-center justify-between cursor-pointer" style={{ background: "none", border: "none" }}>
                  <div><p style={{ fontSize: 14, fontWeight: 600, color: C.navy }}>View all calving records</p><p style={{ fontSize: 12, fontWeight: 500, color: "rgba(26,26,26,0.35)" }}>{m.total} records · {year} Season</p></div>
                  <Chevron />
                </button>
              </WCard>

            </div>
          )}
        </>
      )}

      {/* ═══════ COMPARE TAB ═══════ */}
      {tab === "Compare" && (
        <div className="flex flex-col gap-3 pb-10">

          {/* Multi-select year pills */}
          <div className="flex flex-wrap gap-2">
            {yearOptions.filter((y) => y >= 2023).map((y) => {
              const selected = compareYears.includes(y);
              return (
                <button key={y} className="cursor-pointer active:scale-[0.97]"
                  onClick={() => {
                    if (selected) {
                      if (compareYears.length > 1) setCompareYears(compareYears.filter((cy) => cy !== y));
                    } else {
                      if (compareYears.length < 3) setCompareYears([...compareYears, y].sort((a, b) => b - a));
                    }
                  }}
                  style={{
                    padding: "6px 16px", borderRadius: 20, fontSize: 12, fontWeight: 600, border: selected ? "none" : "1px solid #D4D4D0",
                    background: selected ? C.navy : "transparent", color: selected ? "#FFF" : "rgba(26,26,26,0.5)",
                  }}>
                  {y}{y === currentYear ? "*" : ""}
                </button>
              );
            })}
            <span style={{ fontSize: 10, color: "rgba(26,26,26,0.3)", alignSelf: "center", marginLeft: 4 }}>Select up to 3</span>
          </div>

          {compareLoading ? <Skeleton /> : compareData && compareData.length > 0 && (
            <>
              {/* Side-by-side KPI cards */}
              <WCard>
                <Lbl>Season Summary</Lbl>
                <div className="mt-3" style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                    <thead>
                      <tr>
                        <th style={{ textAlign: "left", padding: "4px 8px 8px 0", fontSize: 10, fontWeight: 600, color: "rgba(26,26,26,0.35)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Metric</th>
                        {compareData.map((yd) => (
                          <th key={yd.yr} style={{ textAlign: "right", padding: "4px 8px 8px", fontSize: 12, fontWeight: 700, color: C.navy }}>
                            {yd.yr}{yd.yr === currentYear ? "*" : ""}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        { label: "Total born", key: "total", fmt: (v: any) => String(v.total) },
                        { label: "Alive", key: "alive", fmt: (v: any) => String(v.alive) },
                        { label: "Death loss", key: "deathPct", fmt: (v: any) => `${v.dead} (${v.deathPct}%)`, color: (v: any) => Number(v.deathPct) > 5 ? C.crimson : C.text },
                        { label: "Avg birth wt", key: "avgWt", fmt: (v: any) => v.avgWt ? `${v.avgWt} lb` : "—" },
                        { label: "Hard pulls", key: "hardPulls", fmt: (v: any) => `${v.hardPulls} (${v.hardPullPct}%)`, color: (v: any) => Number(v.hardPullPct) > 3 ? C.burgundy : C.text },
                        { label: "Bull / heifer %", key: "bullHeiferPct", fmt: (v: any) => `${v.bullPct}/${v.heiferPct}` },
                        { label: "Season span", key: "seasonDays", fmt: (v: any) => v.seasonDays > 0 ? `${v.seasonDays}d` : "—" },
                        { label: "First calf", key: "firstCalf", fmt: (v: any) => v.firstCalf ? new Date(v.firstCalf + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "—" },
                        { label: "Last calf", key: "lastCalf", fmt: (v: any) => v.lastCalf ? new Date(v.lastCalf + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "—" },
                      ].map((row, ri) => (
                        <tr key={row.label} style={{ borderTop: ri > 0 ? "1px solid rgba(212,212,208,0.2)" : "none" }}>
                          <td style={{ padding: "6px 8px 6px 0", fontWeight: 500, color: "rgba(26,26,26,0.55)" }}>{row.label}</td>
                          {compareData.map((yd) => (
                            <td key={yd.yr} style={{ padding: "6px 8px", textAlign: "right", fontWeight: 600, color: row.color ? row.color(yd) : C.text }}>
                              {row.fmt(yd)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </WCard>

              {/* Overlaid calving curves */}
              <Divider title="Calving Curves Overlaid" />
              <WCard>
                <Lbl>Births by Day of Year</Lbl>
                <div style={{ width: "100%", height: 220 }} className="mt-2">
                  <ResponsiveContainer>
                    <AreaChart margin={{ top: 4, right: 4, left: -22, bottom: 0 }}
                      data={(() => {
                        // Merge all years by day-of-year
                        const allDays: Record<number, any> = {};
                        compareData.forEach((yd) => {
                          yd.dailyCurve.forEach((pt) => {
                            if (!allDays[pt.dayOfYear]) allDays[pt.dayOfYear] = { dayOfYear: pt.dayOfYear, d: pt.d };
                            allDays[pt.dayOfYear][`y${yd.yr}`] = pt.births;
                          });
                        });
                        return Object.values(allDays).sort((a, b) => a.dayOfYear - b.dayOfYear);
                      })()}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(14,38,70,0.06)" />
                      <XAxis dataKey="d" tick={{ fontSize: 8, fill: "rgba(26,26,26,0.35)" }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                      <YAxis tick={{ fontSize: 8, fill: "rgba(26,26,26,0.35)" }} axisLine={false} tickLine={false} />
                      <Tooltip content={<Tip />} />
                      {compareData.map((yd, i) => {
                        const colors = [C.royalBlue, C.antiqueGold, C.deepPurple];
                        const dashes = ["", "5 3", "3 2"];
                        return (
                          <Area key={yd.yr} type="monotone" dataKey={`y${yd.yr}`} name={String(yd.yr)}
                            stroke={colors[i % 3]} strokeWidth={i === 0 ? 2.5 : 1.5}
                            strokeDasharray={dashes[i]} fill="none" />
                        );
                      })}
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex justify-center gap-6 mt-2">
                  {compareData.map((yd, i) => {
                    const colors = [C.royalBlue, C.antiqueGold, C.deepPurple];
                    return (
                      <div key={yd.yr} className="flex items-center gap-1.5">
                        <div className="rounded-sm" style={{ width: 8, height: 8, backgroundColor: colors[i % 3] }} />
                        <span style={{ fontSize: 10, fontWeight: 600, color: "rgba(26,26,26,0.55)" }}>{yd.yr}{yd.yr === currentYear ? "*" : ""}</span>
                        <span style={{ fontSize: 10, fontWeight: 700, color: C.text }}>{yd.total}</span>
                      </div>
                    );
                  })}
                </div>
                <Sub color="rgba(26,26,26,0.3)">* season in progress · curves aligned by day of year</Sub>
              </WCard>

              {/* Death loss trend */}
              <Divider title="Death Loss Trend" />
              <WCard>
                <Lbl>Death Loss % by Year</Lbl>
                <div style={{ width: "100%", height: 160 }} className="mt-2">
                  <ResponsiveContainer>
                    <BarChart data={compareData} margin={{ top: 4, right: 4, left: -22, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(14,38,70,0.06)" />
                      <XAxis dataKey="yr" tick={{ fontSize: 10, fill: "rgba(26,26,26,0.45)" }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 8, fill: "rgba(26,26,26,0.35)" }} axisLine={false} tickLine={false} unit="%" />
                      <Tooltip content={<Tip />} />
                      <Bar dataKey="deathPct" radius={[4, 4, 0, 0]} name="Death Loss %">
                        {compareData.map((yd, i) => (
                          <Cell key={yd.yr} fill={Number(yd.deathPct) > 5 ? C.crimson : C.royalBlue} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </WCard>

              {/* Avg birth weight trend */}
              <Divider title="Birth Weight Trend" />
              <WCard>
                <Lbl>Avg Birth Weight by Year (lb)</Lbl>
                <div style={{ width: "100%", height: 160 }} className="mt-2">
                  <ResponsiveContainer>
                    <BarChart data={compareData.filter((d) => d.avgWt)} margin={{ top: 4, right: 4, left: -22, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(14,38,70,0.06)" />
                      <XAxis dataKey="yr" tick={{ fontSize: 10, fill: "rgba(26,26,26,0.45)" }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 8, fill: "rgba(26,26,26,0.35)" }} axisLine={false} tickLine={false} domain={[75, 90]} unit=" lb" />
                      <Tooltip content={<Tip />} />
                      <Bar dataKey="avgWt" radius={[4, 4, 0, 0]} name="Avg Weight" fill={C.antiqueGold} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </WCard>
            </>
          )}

          {!compareLoading && (!compareData || compareData.length === 0) && (
            <div className="pt-6 text-center">
              <p style={{ fontSize: 13, color: "rgba(26,26,26,0.4)" }}>Select years above to compare.</p>
            </div>
          )}
        </div>
      )}

      {/* ═══════ RECORDS TAB ═══════ */}
      {tab === "Records" && <CalvingScreen />}
    </div>
  );
}
